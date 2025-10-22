# Theme Management API

A NestJS-based REST API for managing mobile app themes with version control. This system allows mobile applications to check the current theme version and download theme assets as zip files.

## Features

- Version-controlled theme management
- Download themes as zip files containing SVG and PNG assets
- RESTful API with Swagger documentation
- File system-based storage (no database required)
- JSON metadata for version tracking

## Installation

```bash
yarn install
```

## Running the Application

```bash
# Development mode
yarn start:dev

# Production mode
yarn build
yarn start:prod
```

The API will be available at `http://localhost:3000`

## API Documentation

Once the server is running, visit `http://localhost:3000/api` to access the Swagger UI documentation.

## API Endpoints

### 1. Get Current Theme Version
```
GET /themes/current
```

Returns the current theme version information.

**Response:**
```json
{
  "version": "1",
  "releaseDate": "2025-01-14T00:00:00Z",
  "size": 582,
  "changelog": "Initial theme release with sample SVG and PNG assets"
}
```

### 2. List All Versions
```
GET /themes/versions
```

Returns an array of all theme versions.

**Response:**
```json
[
  {
    "version": "1",
    "releaseDate": "2025-01-14T00:00:00Z",
    "size": 582,
    "changelog": "Initial theme release"
  }
]
```

### 3. Download Latest Theme
```
GET /themes/download
```

Downloads the current theme version as a zip file.

**Response:** Binary zip file

### 4. Download Specific Version
```
GET /themes/download/:version
```

Downloads a specific theme version as a zip file.

**Example:** `GET /themes/download/1`

**Response:** Binary zip file

### 5. Get Data.json Manifest (Current Version)
```
GET /themes/data
```

Returns the data.json manifest file for the current theme version. This file maps asset keys to their file paths.

**Response:**
```json
{
  "icon1": "./svg/icon1.svg",
  "icon2": "./svg/icon2.svg",
  "image1": "./png/image1.png",
  "image2": "./png/image2.png"
}
```

### 6. Get Data.json Manifest (Specific Version)
```
GET /themes/data/:version
```

Returns the data.json manifest file for a specific theme version.

**Example:** `GET /themes/data/1`

**Response:**
```json
{
  "icon1": "./svg/icon1.svg",
  "icon2": "./svg/icon2.svg",
  "image1": "./png/image1.png",
  "image2": "./png/image2.png"
}
```

### 7. Upload New Theme Version
```
POST /themes/upload
Content-Type: multipart/form-data
```

Uploads a new theme version. The version number is auto-incremented. A data.json manifest is automatically generated from the zip contents.

**Request Body:**
- `file`: The theme zip file (required)
- `changelog`: Description of changes (optional)

**Response:**
```json
{
  "version": "2",
  "releaseDate": "2025-01-15T00:00:00Z",
  "size": 1024000,
  "changelog": "Updated icons and colors"
}
```

## Theme Zip Structure

Each theme zip file should contain:
```
theme.zip
├── data.json          # Asset manifest (optional - auto-generated if missing)
├── svg/
│   ├── icon1.svg
│   ├── icon2.svg
│   └── ...
└── png/
    ├── image1.png
    ├── image2.png
    └── ...
```

**Note:** You can include your own `data.json` file in the zip, or the server will automatically generate one based on the files in the zip.

## Data.json Manifest

The `data.json` file maps asset keys to their file paths. You have two options:

### Option 1: Include Your Own data.json (Recommended)

Create your own `data.json` with descriptive keys and include it in the zip:

```json
{
  "home_icon": "./svg/icon1.svg",
  "settings_icon": "./svg/icon2.svg",
  "profile_image": "./png/image1.png",
  "background_image": "./png/image2.png"
}
```

**Benefits:**
- Use descriptive, meaningful keys
- Full control over key naming
- Better for mobile app integration

### Option 2: Auto-Generated data.json

If you don't include a `data.json` file, the server will automatically generate one based on filenames.

**Auto-Generation Rules:**
- Keys are derived from filenames (without extension)
- Special characters are replaced with underscores
- Keys are converted to lowercase
- Example: `icon_home.svg` → `icon_home`

**Purpose:**
- Makes it easy for mobile apps to know what assets are available
- Provides a consistent API to access theme assets
- Eliminates the need to parse zip file contents manually

**Mobile App Usage:**
```javascript
// 1. Download data.json
const dataResponse = await fetch('http://your-api/themes/data');
const dataJson = await dataResponse.json();

// 2. Use keys to access assets
const icon1Path = dataJson.icon1; // "./svg/icon1.svg"
const image1Path = dataJson.image1; // "./png/image1.png"

// 3. Extract and use assets from theme.zip
```

## Storage Structure

Themes are stored in the `storage/themes/` directory:

```
storage/
└── themes/
    ├── metadata.json           # Version metadata
    └── versions/
        ├── v1/
        │   ├── theme.zip       # Theme assets
        │   └── data.json       # Asset manifest
        ├── v2/
        │   ├── theme.zip       # Theme assets
        │   └── data.json       # Asset manifest
        └── ...
```

## Metadata Format

The `metadata.json` file tracks all theme versions:

```json
{
  "currentVersion": "1",
  "versions": [
    {
      "version": "1",
      "releaseDate": "2025-01-14T00:00:00Z",
      "size": 582,
      "changelog": "Initial theme release"
    }
  ]
}
```

## Usage Examples

### Check Current Version (cURL)
```bash
curl http://localhost:3000/themes/current
```

### Download Latest Theme (cURL)
```bash
curl -O http://localhost:3000/themes/download
```

### Download Specific Version (cURL)
```bash
curl -O http://localhost:3000/themes/download/1
```

### Upload New Theme (cURL)
```bash
curl -X POST \
  http://localhost:3000/themes/upload \
  -F "file=@theme.zip" \
  -F "changelog=Updated icons and colors"
```

### Mobile App Integration Example

```javascript
// Check current theme version
const response = await fetch('http://your-api/themes/current');
const currentTheme = await response.json();

// Compare with local version
if (localVersion !== currentTheme.version) {
  // Download new theme
  const themeResponse = await fetch('http://your-api/themes/download');
  const blob = await themeResponse.blob();
  
  // Save and apply theme
  await saveTheme(blob);
}
```

## Error Handling

- `404 Not Found`: Theme version doesn't exist
- `400 Bad Request`: Invalid file format or missing file
- `500 Internal Server Error`: File system errors

## Development

```bash
# Run linter
yarn lint

# Run tests
yarn test

# Run e2e tests
yarn test:e2e
```

## Technologies Used

- NestJS
- TypeScript
- Swagger/OpenAPI
- Multer (file uploads)
- Archiver (zip handling)

## License

UNLICENSED

