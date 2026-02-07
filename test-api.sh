#!/bin/bash

# Script de testing para todos los endpoints de la API
# Uso: ./test-api.sh

BASE_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Testing Music App API ===${NC}\n"

# Variables para almacenar tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""

# Función para hacer requests
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local description=$5
    
    echo -e "${YELLOW}Testing: ${description}${NC}"
    echo "  ${method} ${endpoint}"
    
    if [ -n "$token" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${token}" \
            ${BASE_URL}${endpoint} \
            ${data:+-d "$data"})
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} \
            -H "Content-Type: application/json" \
            ${BASE_URL}${endpoint} \
            ${data:+-d "$data"})
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✓ Success (${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "  ${RED}✗ Failed (${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
}

# ============================================
# 1. ENDPOINTS PÚBLICOS (Sin autenticación)
# ============================================
echo -e "${YELLOW}=== 1. ENDPOINTS PÚBLICOS ===${NC}\n"

# Health Check
make_request "GET" "/health" "" "" "Health Check"

# Register
echo -e "${YELLOW}Registrando usuario de prueba...${NC}"
register_data='{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
register_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$register_data" \
    ${BASE_URL}/auth/register)

ACCESS_TOKEN=$(echo "$register_response" | jq -r '.accessToken // empty')
REFRESH_TOKEN=$(echo "$register_response" | jq -r '.refreshToken // empty')

if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✓ Usuario registrado y autenticado${NC}"
    echo "  Access Token: ${ACCESS_TOKEN:0:50}..."
    echo ""
else
    echo -e "${RED}✗ Error al registrar usuario${NC}"
    echo "$register_response" | jq '.' 2>/dev/null || echo "$register_response"
    echo ""
    
    # Intentar login
    echo -e "${YELLOW}Intentando login...${NC}"
    login_data='{"email":"test@example.com","password":"password123"}'
    login_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$login_data" \
        ${BASE_URL}/auth/login)
    
    ACCESS_TOKEN=$(echo "$login_response" | jq -r '.accessToken // empty')
    REFRESH_TOKEN=$(echo "$login_response" | jq -r '.refreshToken // empty')
    
    if [ -n "$ACCESS_TOKEN" ]; then
        echo -e "${GREEN}✓ Login exitoso${NC}"
        echo ""
    else
        echo -e "${RED}✗ Error en login${NC}"
        echo "$login_response" | jq '.' 2>/dev/null || echo "$login_response"
        echo ""
        exit 1
    fi
fi

# Refresh Token
if [ -n "$REFRESH_TOKEN" ]; then
    make_request "POST" "/auth/refresh" "{\"refreshToken\":\"${REFRESH_TOKEN}\"}" "" "Refresh Token"
fi

# ============================================
# 2. ENDPOINTS DE AUTENTICACIÓN (Protegidos)
# ============================================
echo -e "${YELLOW}=== 2. ENDPOINTS DE AUTENTICACIÓN ===${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # Get Profile
    make_request "GET" "/auth/me" "" "$ACCESS_TOKEN" "Get User Profile"
    
    # Logout
    if [ -n "$REFRESH_TOKEN" ]; then
        make_request "POST" "/auth/logout" "{\"refreshToken\":\"${REFRESH_TOKEN}\"}" "$ACCESS_TOKEN" "Logout"
    fi
fi

# ============================================
# 3. ENDPOINTS DE MÚSICA (Protegidos)
# ============================================
echo -e "${YELLOW}=== 3. ENDPOINTS DE MÚSICA ===${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # Explore
    make_request "GET" "/music/explore" "" "$ACCESS_TOKEN" "Explore Music"
    
    # Categories
    make_request "GET" "/music/categories" "" "$ACCESS_TOKEN" "Get Categories"
    
    # Genres
    make_request "GET" "/music/genres" "" "$ACCESS_TOKEN" "Get Genres"
    
    # Search
    make_request "GET" "/music/search?q=rock&filter=songs" "" "$ACCESS_TOKEN" "Search Music"
    
    # Recent Searches
    make_request "GET" "/music/recent-searches?limit=10" "" "$ACCESS_TOKEN" "Get Recent Searches"
    
    # For You
    make_request "GET" "/music/for-you" "" "$ACCESS_TOKEN" "Get For You Content"
    
    # Recently Listened
    make_request "GET" "/music/recently-listened" "" "$ACCESS_TOKEN" "Get Recently Listened"
fi

# ============================================
# 4. ENDPOINTS DE BIBLIOTECA (Protegidos)
# ============================================
echo -e "${YELLOW}=== 4. ENDPOINTS DE BIBLIOTECA ===${NC}\n"

if [ -n "$ACCESS_TOKEN" ]; then
    # Library Summary
    make_request "GET" "/library/summary" "" "$ACCESS_TOKEN" "Get Library Summary"
    
    # Favorite Songs
    make_request "GET" "/library/songs?page=1&limit=20" "" "$ACCESS_TOKEN" "Get Favorite Songs"
    
    # Favorite Playlists
    make_request "GET" "/library/playlists?page=1&limit=20" "" "$ACCESS_TOKEN" "Get Favorite Playlists"
    
    # Favorite Genres
    make_request "GET" "/library/genres?page=1&limit=20" "" "$ACCESS_TOKEN" "Get Favorite Genres"
fi

# ============================================
# 5. TESTING DE ERRORES
# ============================================
echo -e "${YELLOW}=== 5. TESTING DE ERRORES ===${NC}\n"

# Endpoint protegido sin token
echo -e "${YELLOW}Testing: Endpoint protegido sin token${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET ${BASE_URL}/auth/me)
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 401 ]; then
    echo -e "  ${GREEN}✓ Correctamente rechazado (401)${NC}"
else
    echo -e "  ${RED}✗ Debería retornar 401, pero retornó ${http_code}${NC}"
fi
echo ""

# Endpoint con token inválido
echo -e "${YELLOW}Testing: Endpoint con token inválido${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET \
    -H "Authorization: Bearer invalid_token_12345" \
    ${BASE_URL}/auth/me)
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 401 ]; then
    echo -e "  ${GREEN}✓ Correctamente rechazado (401)${NC}"
else
    echo -e "  ${RED}✗ Debería retornar 401, pero retornó ${http_code}${NC}"
fi
echo ""

echo -e "${GREEN}=== Testing completado ===${NC}"
