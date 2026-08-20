import { handleServiceError } from '../../utils/error';
import _Error from '../../utils/error';
import IFile, {
  generateShortPath,
} from '../../core/domains/interface/files';
import storage from '../../files';
import { FileUploadOptions } from '../../files/Storage';
import { FileRepositoryFactory } from '../../infrastructure/repositories/factories/FileRepositoryFactory';

const fileRepository = FileRepositoryFactory.create();

export const uploadFile = async (file: Express.Multer.File, org_id: string, is_public: boolean = false, options?: FileUploadOptions) => {
  try {
    const originalname = file?.originalname;
    if (!originalname) {
      throw new _Error('File name is required', 400);
    }

    const { path, url } = await storage.uploadFile(file, org_id, options);

    const fileData: IFile = {
      organization_id: org_id,
      name: options?.file_name || file.originalname,
      file_path: path,
      size: file.size,
      file_type: file.mimetype,
      file_extension: file.mimetype.split('/')[1],
      file_url: url, // aws url
      is_public: is_public,
      short_path: generateShortPath(options?.file_name || file.originalname, org_id), // public id
    };

    const newFile = await fileRepository.create(fileData);
    return newFile;
  } catch (error) {
    handleServiceError(error);
  }
}

export const deleteFile = async (org_id: string, query: {
  short_path?: string,
  file_path?: string,
  file_name?: string,
  file_id?: string,
}) => {
  try {
    const { short_path, file_path, file_name, file_id } = query;
    if (!short_path && !file_path && !file_name && !file_id) {
      throw new _Error('File path, name or short path is required', 400);
    }

    const file = file_id ? await fileRepository.findById(file_id) : null;

    if (!file || !file.file_path) {
      return true;
    }

    await storage.deleteFile(file.file_path as string);
    await fileRepository.delete(file.id);

    return true;
  } catch (error) {
    handleServiceError(error);
  }
}
