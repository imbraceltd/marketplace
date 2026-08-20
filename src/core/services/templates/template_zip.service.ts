import JSZip from 'jszip';
import _Error from '../../../utils/error';

export interface TemplatePayload {
    name: string;
    type: string;
    description?: string;
    graph: any;
    deps?: any;
    [key: string]: any;
}

export interface TemplateZipMetadata {
    title: string;
    description: string;
    type: string;
    version: string;
}

const TEMPLATE_ENTRY = 'template.json';
const ZIP_VERSION = '1.0';

export const buildTemplateZip = async (template: TemplatePayload): Promise<Buffer> => {
    if (!template?.graph) {
        throw new _Error('Cannot build zip: template.graph is missing', 400);
    }

    const metadata: TemplateZipMetadata = {
        title: template.name || '',
        description: template.description || '',
        type: template.type || '',
        version: ZIP_VERSION,
    };

    const zip = new JSZip();
    zip.file(TEMPLATE_ENTRY, JSON.stringify(template));

    return await zip.generateAsync({
        type: 'nodebuffer',
        comment: JSON.stringify(metadata),
    });
};

export const parseTemplateZip = async (
    buffer: Buffer,
): Promise<{ metadata: TemplateZipMetadata | null; template: TemplatePayload }> => {
    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(new Uint8Array(buffer));
    } catch (err: any) {
        throw new _Error(`Invalid ZIP file: ${err?.message || 'cannot read archive'}`, 400);
    }

    let entry = zip.file(TEMPLATE_ENTRY);
    if (!entry) {
        const candidate = Object.values(zip.files).find(
            (f) => !f.dir && !f.name.includes('/') && /\.(json|txt)$/i.test(f.name),
        );
        entry = candidate ?? null;
    }
    if (!entry) {
        throw new _Error(`Invalid template ZIP: no template file found`, 400);
    }

    let parsed: TemplatePayload & { data?: TemplatePayload };
    try {
        const raw = await entry.async('string');
        parsed = JSON.parse(raw);
    } catch (err: any) {
        throw new _Error(`Invalid template ZIP: '${entry.name}' is not valid JSON`, 400);
    }

    const template: TemplatePayload =
        parsed?.data && typeof parsed.data === 'object' && parsed.data.graph ? parsed.data : parsed;

    if (!template?.graph) {
        throw new _Error("Invalid template ZIP: 'template.graph' is required", 400);
    }

    let metadata: TemplateZipMetadata | null = null;
    const archiveComment: string | undefined = (zip as any).comment;
    if (archiveComment) {
        try {
            metadata = JSON.parse(archiveComment);
        } catch {
            metadata = null;
        }
    }

    return { metadata, template };
};
