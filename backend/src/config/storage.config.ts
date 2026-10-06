import { registerAs } from '@nestjs/config';
import { join } from 'path';

export default registerAs('storage', () => {
  // Equivale a storage/app de Laravel. Por defecto backend/uploads (dos niveles arriba de
  // dist/config o src/config).
  const uploadsDir =
    process.env.UPLOADS_DIR?.trim() || join(__dirname, '..', '..', 'uploads');
  return {
    uploadsDir,
    // Equivale a storage/app/public de Laravel (fotos del gabinete y de perfil).
    publicDir:
      process.env.UPLOADS_PUBLIC_DIR?.trim() || join(uploadsDir, 'public'),
  };
});
