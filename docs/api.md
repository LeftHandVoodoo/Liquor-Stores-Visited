# API Reference

## Overview

This document describes the API interfaces for Liquor Stores.

## Base URL

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api` |
| Staging | `https://staging.example.com/api` |
| Production | `https://api.example.com` |

## Authentication

### Method
[JWT Bearer Token / API Key / OAuth 2.0]

### Headers
```
Authorization: Bearer <token>
```

### Obtaining Tokens
[Describe authentication flow]

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Endpoints

### [Resource Group 1]

#### List [Resources]

```
GET /resources
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | integer | No | Max results (default: 20) |
| `offset` | integer | No | Pagination offset |
| `filter` | string | No | Filter criteria |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

#### Get [Resource]

```
GET /resources/:id
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Resource ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Example",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Create [Resource]

```
POST /resources
```

**Request Body:**
```json
{
  "name": "New Resource",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "124",
    "name": "New Resource",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Update [Resource]

```
PUT /resources/:id
```

**Request Body:**
```json
{
  "name": "Updated Name"
}
```

#### Delete [Resource]

```
DELETE /resources/:id
```

**Response:**
```json
{
  "success": true,
  "data": null
}
```

---

## CLI API

### Commands

#### `[command] [subcommand]`

```bash
myapp [command] [options]
```

**Global Options:**

| Option | Description |
|--------|-------------|
| `--help, -h` | Show help |
| `--version, -v` | Show version |
| `--verbose` | Verbose output |

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| General | 100 requests | 1 minute |
| Auth | 10 requests | 1 minute |

## Versioning

API versioning is handled via URL path:
- Current: `/api/v1/`

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| v0.1.0 | 2026-01-21 | Initial release |
