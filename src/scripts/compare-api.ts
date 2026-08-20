import logger from '../server/logging/logger';

import axios from 'axios';
import { diff } from 'json-diff';
import chalk from 'chalk';

const CONFIG = {
    baseUrl: 'http://localhost:9982',
    headers: {
        'x-organization-id': 'org_imbrace',
        'x-user-id': 'u_admin'
    }
};

interface ApiMapping {
    name: string;
    v1Path: string;
    v3Path: string;
    v1Params?: any;
    v3Params?: any;
}

const COLLECTIONS: ApiMapping[] = [
    {
        name: 'Apps',
        v1Path: '/v1/apps',
        v3Path: '/v3/apps',
        v1Params: { organization_id: CONFIG.headers['x-organization-id'] },
        v3Params: { organizationId: CONFIG.headers['x-organization-id'] }
    },
    {
        name: 'Email Senders',
        v1Path: '/v1/apps/email-senders',
        v3Path: '/v3/emailsenders',
        v1Params: { organization_id: CONFIG.headers['x-organization-id'] },
        v3Params: { organizationId: CONFIG.headers['x-organization-id'] }
    },
    {
        name: 'Email Templates',
        v1Path: '/v1/apps/email-templates',
        v3Path: '/v3/emailtemplates',
        v1Params: { organization_id: CONFIG.headers['x-organization-id'] },
        v3Params: { organizationId: CONFIG.headers['x-organization-id'] }
    },
    /*
    {
        name: 'Files',
        v1Path: '/v1/files', 
        v3Path: '/v3/files',
        v1Params: { organization_id: CONFIG.headers['x-organization-id'] },
        v3Params: { organizationId: CONFIG.headers['x-organization-id'] }
    },
    */
    {
        name: 'Forms',
        v1Path: '/v1/apps/forms',
        v3Path: '/v3/forms',
        v1Params: { organization_id: CONFIG.headers['x-organization-id'] },
        v3Params: { organizationId: CONFIG.headers['x-organization-id'] }
    },
    {
        name: 'Templates',
        v1Path: '/v1/market-places/templates',
        v3Path: '/v3/templates',
        v1Params: { organization_id: CONFIG.headers['x-organization-id'] },
        v3Params: { organizationId: CONFIG.headers['x-organization-id'] }
    },
    {
        name: 'Use Cases',
        v1Path: '/v1/use-cases',
        v3Path: '/v3/usecases',
        v1Params: { organization_id: CONFIG.headers['x-organization-id'] },
        v3Params: { organizationId: CONFIG.headers['x-organization-id'] }
    }
];

async function compareCollection(mapping: ApiMapping) {
    logger.info(chalk.blue(`\n=== Comparing Collection: ${mapping.name} ===`));

    try {
        const v1Url = `${CONFIG.baseUrl}${mapping.v1Path}`;
        const v3Url = `${CONFIG.baseUrl}${mapping.v3Path}`;

        const v1Res = await axios.get(v1Url, {
            headers: CONFIG.headers,
            params: mapping.v1Params
        });

        const v3Res = await axios.get(v3Url, {
            headers: CONFIG.headers,
            params: mapping.v3Params
        });

        const v1Data = v1Res.data;
        const v3Data = v3Res.data;

        // 1. Comparing outer structure
        const v1Keys = Object.keys(v1Data).sort();
        const v3Keys = Object.keys(v3Data).sort();

        if (JSON.stringify(v1Keys) === JSON.stringify(v3Keys)) {
            logger.info(chalk.green('   [OK] Outer structure matches'));
        } else {
            logger.info(chalk.red(`   [FAIL] Outer structure mismatch: v1=[${v1Keys}], v3=[${v3Keys}]`));
        }

        // 2. Comparing record count
        const v1List = Array.isArray(v1Data.data) ? v1Data.data : [];
        const v3List = Array.isArray(v3Data.data) ? v3Data.data : [];
        const v1Count = v1List.length;
        const v3Count = v3List.length;

        if (v1Count === v3Count) {
            logger.info(chalk.green(`   [OK] Same count: ${v1Count} records`));
        } else {
            logger.info(chalk.red(`   [WARNING] Count mismatch: v1=${v1Count}, v3=${v3Count}`));
        }

        // 3. Detailed comparison of a sample record
        if (v1Count > 0 && v3Count > 0) {
            // Try to find a matching record by ID or just use the first one
            const sampleV1 = v1List[0];
            const sampleV3 = v3List.find((item: any) =>
                (item.id && (item.id === sampleV1.id || item.id === sampleV1._id)) ||
                (item._id && (item._id === sampleV1.id || item._id === sampleV1._id))
            ) || v3List[0];

            logger.info(chalk.cyan(`   Comparing sample record (ID: ${sampleV1.id || sampleV1._id})...`));

            // Note: v1 and v3 might have different field names (snake_case vs camelCase)
            // But for now we shows the raw diff
            const difference = diff(sampleV1, sampleV3);

            if (!difference) {
                logger.info(chalk.green('   [OK] Sample record matches 100%!'));
            } else {
                logger.info(chalk.yellow('   [!] Difference detected in sample record:'));
                const diffStr = JSON.stringify(difference, null, 2);
                if (diffStr.split('\n').length > 20) {
                    logger.info(diffStr.split('\n').slice(0, 20).join('\n'));
                    logger.info(chalk.gray(`   ... (truncated ${diffStr.split('\n').length - 20} lines)`));
                } else {
                    logger.info(diffStr);
                }
            }
        } else if (v1Count === 0 && v3Count === 0) {
            logger.info(chalk.gray('   [INFO] Both collections are empty.'));
        }

    } catch (error: any) {
        if (error.response) {
            logger.error(chalk.red(`   [ERROR] ${error.response.status} - ${error.response.statusText} at ${error.config.url}`));
        } else {
            logger.error(chalk.red(`   [ERROR] ${error.message}`));
        }
    }
}

async function runAllComparisons() {
    logger.info(chalk.bold.magenta('\n***************************************************'));
    logger.info(chalk.bold.magenta('*            API CROSS-VERSION COMPARISON         *'));
    logger.info(chalk.bold.magenta('***************************************************\n'));

    for (const collection of COLLECTIONS) {
        await compareCollection(collection);
    }

    logger.info(chalk.bold.magenta('\n***************************************************'));
    logger.info(chalk.bold.magenta('*                COMPARISON FINISHED              *'));
    logger.info(chalk.bold.magenta('***************************************************\n'));
}

runAllComparisons();
