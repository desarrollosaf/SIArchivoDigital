import { registerAs } from '@nestjs/config';
import { join } from 'path';

export default registerAs('storage', () => ({
  // Por defecto backend/uploads (dos niveles arriba de dist/config o src/config).
  uploadsDir:
    process.env.UPLOADS_DIR?.trim() || join(__dirname, '..', '..', 'uploads'),
}));
