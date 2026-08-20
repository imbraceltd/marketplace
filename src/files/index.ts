import { Storage } from "./Storage";
import S3Storage from "./s3";
import LocalStorage from "./local_storage";
import config from "../config";

const storage: Storage = config.use_local_storage ? new LocalStorage(config.domain) : new S3Storage();

export default storage;