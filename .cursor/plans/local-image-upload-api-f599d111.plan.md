<!-- f599d111-fbe1-4e9a-900c-0c0f11d41fb0 f026ef3a-900b-4631-b76e-2a42baa692b7 -->
# Local Image Upload API Implementation

## Overview

Add endpoints to upload, download, and manage images stored locally in `storage/images/` directory. Images will use unique filenames (timestamp-uuid + original name) and return relative paths for MongoDB storage.

## Implementation Steps

### 1. Create Images Module Structure

Create new module at `src/images/`:

- `images.module.ts` - Module definition
- `images.controller.ts` - API endpoints
- `images.service.ts` - Business logic
- `dto/upload-image.dto.ts` - Response DTO

### 2. Images Service (`src/images/images.service.ts`)

Implement core functionality:

- **Upload**: Save images to `storage/images/` with unique names (format: `{timestamp}-{uuid}-{originalname}`)
- **Validation**: Check file type (jpg, jpeg, png, gif, webp) and size limits
- **File operations**: Use Node.js `fs/promises` for async file operations
- **Path handling**: Return relative paths like `/images/filename.png` for database storage

### 3. Images Controller (`src/images/images.controller.ts`)

Create endpoints:

- `POST /images/upload` - Upload single image with multer
  - Accept: multipart/form-data
  - Validate: image types only
  - Return: `{ filename, path, size, mimetype }`
- `GET /images/:filename` - Serve/download image
  - Use `res.sendFile()` for file serving
- `GET /images` - List all uploaded images (optional for admin)
- `DELETE /images/:filename` - Delete image (optional)

Add Swagger decorators for API documentation.

### 4. Multer Configuration

Configure in `images.module.ts`:

- Use memory storage (multer.memoryStorage())
- File filter for image types only
- Optional file size limit (e.g., 5MB)

### 5. Register Module

Update `src/app.module.ts`:

- Import `ImagesModule` in the imports array

### 6. Static File Serving (Optional Enhancement)

Add static file serving in `src/main.ts` to serve images directly via `/storage/images/`:

```typescript
app.useStaticAssets(join(__dirname, '..', 'storage', 'images'), {
  prefix: '/storage/images/',
});
```

## Key Files to Create/Modify

- **Create**: `src/images/images.module.ts`
- **Create**: `src/images/images.controller.ts`
- **Create**: `src/images/images.service.ts`
- **Create**: `src/images/dto/upload-image.dto.ts`
- **Modify**: `src/app.module.ts` (import ImagesModule)
- **Modify**: `src/main.ts` (optional static serving)

## Return Format

Upload response example:

```json
{
  "filename": "1729612345678-abc123-avatar.png",
  "path": "/images/1729612345678-abc123-avatar.png",
  "size": 45678,
  "mimetype": "image/png"
}
```

The `path` field can be stored in MongoDB for user avatar references.

### To-dos

- [ ] Create DTO for image upload response
- [ ] Implement images service with upload, validation, and file operations
- [ ] Create controller with upload, download, and list endpoints
- [ ] Set up images module with multer configuration
- [ ] Register ImagesModule in AppModule
- [ ] Test upload and download endpoints