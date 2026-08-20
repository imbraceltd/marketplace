import { getPrefixId } from './utils';

const docName = 'tag';

export default class Tag {
    newDoc() {
        const id = getPrefixId('tag_');
        const model = {
            doc_name: docName,
            _id: id,
            public_id: id, // For future use, security purpose
            organization_id: '',
            business_unit_id: '',
            name: '',
            type: '',
            created_at: '',
            updated_at: '',
        };
        return model;
    }
}
