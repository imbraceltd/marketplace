import logger from '../../../server/logging/logger';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Coordinator } from "./Coordinator";
import { Cloneable, IResource, ResourceType } from "./interface";

class BasicCloneable implements Cloneable {
    // Assuming data is an object that may store key/value pairs.
    private payload: Record<string, any>;
    constructor(payload: Record<string, any> = {}) {
        this.payload = payload;
    }
    clone(): this {
        // Return a new BasicCloneable with a shallow copy of payload (or deep copy if needed)
        return new BasicCloneable({ ...this.payload }) as this;
    }
    add(...deps: IResource[]): void {
        // logger.debug("Adding dependencies:", deps);
        // Merge dependency info, e.g., store dependency ids.
        if (!this.payload.dependencies) {
            this.payload.dependencies = [];
        }
        deps.forEach(dep => this.payload.dependencies.push(dep.id));
    }
}



function createResource(id: string, name: string, type: ResourceType, payload: any): IResource {
    const resource: IResource = {
        id,
        name,
        type,
        data: new BasicCloneable(payload),
    };
    return resource;
}

// Build the graph from testing data.
function buildGraphFromTestingData(data: any): Coordinator {
    const orgData = data.organization;

    // Create root organization.
    const orgResource = createResource(orgData.id.toString(), orgData.name, ResourceType.ORGANIZATION, orgData);
    const coordinator = new Coordinator(orgResource);

    // Create maps to hold created nodes.
    const databoardMap = new Map<number, IResource>();
    const aiMap = new Map<number, IResource>();
    const workflowMap = new Map<number, IResource>();
    const channelMap = new Map<number, IResource>();
    const journeyMap = new Map<number, IResource>();
    const automationMap = new Map<number, IResource>();

    // --- First pass: Add Nodes ---
    // Add Databoards first.
    if (orgData.databoards) {
        orgData.databoards.forEach((db: any) => {
            const dbResource = createResource(`databoard-${db.id}`, db.name, ResourceType.DATA_BOARD, db);
            databoardMap.set(db.id, dbResource);
            coordinator.addResource(dbResource);
        });
    }
    // Then add AI Assistants.
    if (orgData.ai_assistant) {
        orgData.ai_assistant.forEach((ai: any) => {
            const aiResource = createResource(`ai_assistant-${ai.id}`, ai.name, ResourceType.AI_ASSISTANT, ai);
            aiMap.set(ai.id, aiResource);
            coordinator.addResource(aiResource);
        });
    }
    // Now add Workflows.
    if (orgData.workflows) {
        orgData.workflows.forEach((wf: any) => {
            const wfResource = createResource(`workflow-${wf.id}`, wf.name, ResourceType.WORKFLOW, wf);
            workflowMap.set(wf.id, wfResource);
            coordinator.addResource(wfResource);
        });
    }
    // Channels.
    if (orgData.channels) {
        orgData.channels.forEach((ch: any) => {
            const chResource = createResource(`channel-${ch.id}`, ch.name, ResourceType.CHANNEL, ch);
            channelMap.set(ch.id, chResource);
            coordinator.addResource(chResource);
        });
    }
    // Journeys.
    if (orgData.journeys) {
        orgData.journeys.forEach((j: any) => {
            const jResource = createResource(`journey-${j.id}`, j.name, ResourceType.JOURNEY, j);
            journeyMap.set(j.id, jResource);
            coordinator.addResource(jResource);
        });
    }
    // Automations.
    if (orgData.automations) {
        orgData.automations.forEach((auto: any) => {
            const autoResource = createResource(`automation-${auto.id}`, auto.name, ResourceType.AUTOMATION, auto);
            automationMap.set(auto.id, autoResource);
            coordinator.addResource(autoResource);
        });
    }

    // --- Second pass: Create Edges ---
    // Link organization to each node in dependency order.
    databoardMap.forEach(db => coordinator.addEdge(orgData.id.toString(), db.id));
    aiMap.forEach(ai => coordinator.addEdge(orgData.id.toString(), ai.id));
    workflowMap.forEach(wf => coordinator.addEdge(orgData.id.toString(), wf.id));
    channelMap.forEach(ch => coordinator.addEdge(orgData.id.toString(), ch.id));
    journeyMap.forEach(j => coordinator.addEdge(orgData.id.toString(), j.id));
    automationMap.forEach(auto => coordinator.addEdge(orgData.id.toString(), auto.id));

    // Additional edges.
    // Channels referencing workflows.
    if (orgData.channels) {
        orgData.channels.forEach((ch: any) => {
            if (ch.workflow) {
                const wf = workflowMap.get(ch.workflow);
                if (wf) {
                    coordinator.addEdge(`channel-${ch.id}`, wf.id);
                }
            }
        });
    }
    // Journeys referencing workflows and databoards.
    if (orgData.journeys) {
        orgData.journeys.forEach((j: any) => {
            if (j.workflow) {
                const wf = workflowMap.get(j.workflow);
                if (wf) {
                    coordinator.addEdge(`journey-${j.id}`, wf.id);
                }
            }
            if (j.databoard) {
                const db = databoardMap.get(j.databoard);
                if (db) {
                    coordinator.addEdge(`journey-${j.id}`, db.id);
                }
            }
        });
    }
    // AI Assistants referencing workflows and databoards.
    if (orgData.ai_assistant) {
        orgData.ai_assistant.forEach((ai: any) => {
            const aiResource = aiMap.get(ai.id);
            if (aiResource) {
                if (ai.workflows) {
                    ai.workflows.forEach((wfId: number) => {
                        const wf = workflowMap.get(wfId);
                        if (wf) {
                            // You can choose the direction of this edge.
                            // Either adding an edge from assistant to workflow…
                            coordinator.addEdge(aiResource.id, wf.id);
                            // …or vice versa.
                        }
                    });
                }
                if (ai.databoards) {
                    ai.databoards.forEach((dbId: number) => {
                        const db = databoardMap.get(dbId);
                        if (db) {
                            coordinator.addEdge(aiResource.id, db.id);
                        }
                    });
                }
            }
        });
    }
    // Automations referencing workflows and databoards.
    if (orgData.automations) {
        orgData.automations.forEach((auto: any) => {
            const autoResource = automationMap.get(auto.id);
            if (autoResource) {
                if (auto.Workflow) {
                    const wf = workflowMap.get(auto.Workflow);
                    if (wf) {
                        coordinator.addEdge(autoResource.id, wf.id);
                    }
                }
                if (auto.databoard) {
                    const db = databoardMap.get(auto.databoard);
                    if (db) {
                        coordinator.addEdge(autoResource.id, db.id);
                    }
                }
            }
        });
    }

    return coordinator;
}

function printGraph(coordinator: Coordinator, nodeId: string, indent: number = 0, visited = new Set<string>()) {
    if (visited.has(nodeId)) {
        logger.info(`${' '.repeat(indent)}- (Already printed ${nodeId})`);
        return;
    }
    visited.add(nodeId);
    const node = coordinator.findResource(nodeId);
    if (!node) return;
    logger.info(`${' '.repeat(indent)}- ${node.name} (ID: ${node.id})`);
    const children = coordinator.getChildren(nodeId);
    children.forEach(child => printGraph(coordinator, child.id, indent + 2, visited));
}

/**
 * Clones an individual resource.
 * Uses the Cloneable implementation to produce a cloned payload,
 * updates the id by adding 1000 (assuming id is in "prefix-number" format),
 * and calls data.add() to merge in dependency clones.
 */
async function cloneResource(original: IResource, ...depClones: IResource[]): Promise<IResource> {
    const clonedData = original.data.clone();

    // Update the id directly on the resource
    const parts = original.id.split("-");
    const newId = parts.length === 2 && !isNaN(Number(parts[1]))
        ? `${parts[0]}-${Number(parts[1]) + 1000}`
        : `${original.id}-1000`;

    const newResource: IResource = {
        ...original,
        id: newId,
        data: clonedData,
    };
    newResource.data.add(...depClones);
    return newResource;
}

/**
 * Clones the entire graph using the original testing data.
 * The cloning order is selected so that dependencies are cloned first.
 * For example, databoards and AI assistants (dependencies) are cloned before workflows
 * that refer to them.
 */
// function cloneGraphFromTestingData(data: any): Coordinator {
//     const orgData = data.organization;

//     // Create a cloned organization root.
//     const orgResource = createResource(orgData.id.toString(), "Organization", ResourceType.ORGANIZATION);
//     const clonedOrg = cloneResource(orgResource); // In this example, no dependencies.
//     const cloneCoordinator = new Coordinator(clonedOrg);

//     // Create maps to hold cloned nodes.
//     const cloneDataboardMap = new Map<number, IResource>();
//     const cloneAIMap = new Map<number, IResource>();
//     const cloneWorkflowMap = new Map<number, IResource>();
//     const cloneChannelMap = new Map<number, IResource>();
//     const cloneJourneyMap = new Map<number, IResource>();
//     const cloneAutomationMap = new Map<number, IResource>();

//     // --- First pass: Clone Nodes in Dependency Order ---
//     // 1. Databoards (no dependencies)
//     if (orgData.databoards) {
//         orgData.databoards.forEach((db: any) => {
//             const originalDB = createResource(`databoard-${db.id}`, db.name, ResourceType.DATA_BOARD);
//             const clonedDB = cloneResource(originalDB);
//             cloneDataboardMap.set(db.id, clonedDB);
//             cloneCoordinator.addResource(clonedDB);
//         });
//     }

//     // 2. AI Assistants (assume they depend on databoards, so databoards are passed)
//     if (orgData.ai_assistant) {
//         orgData.ai_assistant.forEach((ai: any) => {
//             const originalAI = createResource(`ai_assistant-${ai.id}`, ai.name, ResourceType.AI_ASSISTANT);
//             let depClones: IResource[] = [];
//             if (ai.databoards && Array.isArray(ai.databoards)) {
//                 depClones = ai.databoards
//                     .map((dbId: number) => cloneDataboardMap.get(dbId))
//                     .filter((r: IResource | undefined): r is IResource => !!r);
//             }
//             const clonedAI = cloneResource(originalAI, ...depClones);
//             cloneAIMap.set(ai.id, clonedAI);
//             cloneCoordinator.addResource(clonedAI);
//         });
//     }

//     // 3. Workflows (which depend on databoards and/or AI assistants)
//     if (orgData.workflows) {
//         orgData.workflows.forEach((wf: any) => {
//             const originalWF = createResource(`workflow-${wf.id}`, wf.name, ResourceType.WORKFLOW);
//             let depClones: IResource[] = [];
//             if (wf.databoards && Array.isArray(wf.databoards)) {
//                 depClones = depClones.concat(
//                     wf.databoards
//                         .map((dbId: number) => cloneDataboardMap.get(dbId))
//                         .filter((r: IResource | undefined): r is IResource => !!r)
//                 );
//             }
//             if (wf.ai_assistants && Array.isArray(wf.ai_assistants)) {
//                 depClones = depClones.concat(
//                     wf.ai_assistants
//                         .map((aiId: number) => cloneAIMap.get(aiId))
//                         .filter((r: IResource | undefined): r is IResource => !!r)
//                 );
//             }
//             const clonedWF = cloneResource(originalWF, ...depClones);
//             cloneWorkflowMap.set(wf.id, clonedWF);
//             cloneCoordinator.addResource(clonedWF);
//         });
//     }

//     // 4. Channels.
//     if (orgData.channels) {
//         orgData.channels.forEach((ch: any) => {
//             const originalCh = createResource(`channel-${ch.id}`, ch.name, ResourceType.CHANNEL);
//             const depClones: IResource[] = [];
//             if (ch.workflow) {
//                 const wfClone = cloneWorkflowMap.get(ch.workflow);
//                 if (wfClone) {
//                     depClones.push(wfClone);
//                 }
//             }
//             const clonedCh = cloneResource(originalCh, ...depClones);
//             cloneChannelMap.set(ch.id, clonedCh);
//             cloneCoordinator.addResource(clonedCh);
//         });
//     }

//     // 5. Journeys.
//     if (orgData.journeys) {
//         orgData.journeys.forEach((j: any) => {
//             const originalJ = createResource(`journey-${j.id}`, j.name, ResourceType.JOURNEY);
//             const depClones: IResource[] = [];
//             if (j.workflow) {
//                 const wfClone = cloneWorkflowMap.get(j.workflow);
//                 if (wfClone) depClones.push(wfClone);
//             }
//             if (j.databoard) {
//                 const dbClone = cloneDataboardMap.get(j.databoard);
//                 if (dbClone) depClones.push(dbClone);
//             }
//             const clonedJ = cloneResource(originalJ, ...depClones);
//             cloneJourneyMap.set(j.id, clonedJ);
//             cloneCoordinator.addResource(clonedJ);
//         });
//     }

//     // 6. Automations.
//     if (orgData.automations) {
//         orgData.automations.forEach((auto: any) => {
//             const originalAuto = createResource(`automation-${auto.id}`, auto.name, ResourceType.AUTOMATION);
//             const depClones: IResource[] = [];
//             if (auto.Workflow) {
//                 const wfClone = cloneWorkflowMap.get(auto.Workflow);
//                 if (wfClone) depClones.push(wfClone);
//             }
//             if (auto.databoard) {
//                 const dbClone = cloneDataboardMap.get(auto.databoard);
//                 if (dbClone) depClones.push(dbClone);
//             }
//             const clonedAuto = cloneResource(originalAuto, ...depClones);
//             cloneAutomationMap.set(auto.id, clonedAuto);
//             cloneCoordinator.addResource(clonedAuto);
//         });
//     }

//     // --- Second pass: Recreate Edges ---
//     // The edges in the cloned graph mimic the structure of the original.
//     // Use the cloned organization root id.
//     const clonedOrgId = clonedOrg.id;

//     cloneDataboardMap.forEach(db => cloneCoordinator.addEdge(clonedOrgId, db.id));
//     cloneAIMap.forEach(ai => cloneCoordinator.addEdge(clonedOrgId, ai.id));
//     cloneWorkflowMap.forEach(wf => cloneCoordinator.addEdge(clonedOrgId, wf.id));
//     cloneChannelMap.forEach(ch => cloneCoordinator.addEdge(clonedOrgId, ch.id));
//     cloneJourneyMap.forEach(j => cloneCoordinator.addEdge(clonedOrgId, j.id));
//     cloneAutomationMap.forEach(auto => cloneCoordinator.addEdge(clonedOrgId, auto.id));

//     // Additional dependency edges.
//     // Channels referencing workflows.
//     if (orgData.channels) {
//         orgData.channels.forEach((ch: any) => {
//             if (ch.workflow) {
//                 const wfClone = cloneWorkflowMap.get(ch.workflow);
//                 const channelClone = cloneChannelMap.get(ch.id);
//                 if (wfClone && channelClone) {
//                     cloneCoordinator.addEdge(channelClone.id, wfClone.id);
//                 }
//             }
//         });
//     }
//     // Journeys referencing workflows and databoards.
//     if (orgData.journeys) {
//         orgData.journeys.forEach((j: any) => {
//             const journeyClone = cloneJourneyMap.get(j.id);
//             if (j.workflow) {
//                 const wfClone = cloneWorkflowMap.get(j.workflow);
//                 if (wfClone && journeyClone) {
//                     cloneCoordinator.addEdge(journeyClone.id, wfClone.id);
//                 }
//             }
//             if (j.databoard) {
//                 const dbClone = cloneDataboardMap.get(j.databoard);
//                 if (dbClone && journeyClone) {
//                     cloneCoordinator.addEdge(journeyClone.id, dbClone.id);
//                 }
//             }
//         });
//     }
//     // AI Assistants referencing workflows and databoards.
//     if (orgData.ai_assistant) {
//         orgData.ai_assistant.forEach((ai: any) => {
//             const aiNode = cloneAIMap.get(ai.id);
//             if (aiNode) {
//                 if (ai.workflows) {
//                     ai.workflows.forEach((wfId: number) => {
//                         const wf = cloneWorkflowMap.get(wfId);
//                         if (wf) {
//                             cloneCoordinator.addEdge(aiNode.id, wf.id);
//                         }
//                     });
//                 }
//                 if (ai.databoards) {
//                     ai.databoards.forEach((dbId: number) => {
//                         const db = cloneDataboardMap.get(dbId);
//                         if (db) {
//                             cloneCoordinator.addEdge(aiNode.id, db.id);
//                         }
//                     });
//                 }
//             }
//         });
//     }
//     // Automations referencing workflows and databoards.
//     if (orgData.automations) {
//         orgData.automations.forEach((auto: any) => {
//             const autoNode = cloneAutomationMap.get(auto.id);
//             if (autoNode) {
//                 if (auto.Workflow) {
//                     const wf = cloneWorkflowMap.get(auto.Workflow);
//                     if (wf) {
//                         cloneCoordinator.addEdge(autoNode.id, wf.id);
//                     }
//                 }
//                 if (auto.databoard) {
//                     const db = cloneDataboardMap.get(auto.databoard);
//                     if (db) {
//                         cloneCoordinator.addEdge(autoNode.id, db.id);
//                     }
//                 }
//             }
//         });
//     }

//     return cloneCoordinator;
// }

/**
 * Clones an entire Coordinator's DAG by processing nodes level by level.
 * Uses the original Coordinator's getNodesAtLevel and getChildren methods.
 *
 * This function:
 * 1. Clones the root resource.
 * 2. For each level from 1 up to highestLevel, clones all nodes at that level.
 * 3. Recreates edges by iterating over each original node and, for each child,
 *    adding an edge from the cloned parent to the cloned child.
 */
// function cloneGraphByLevels(original: Coordinator): Coordinator {
//     // Clone the root node.
//     const originalRoot = original.getRoot();
//     const clonedRoot = cloneResource(originalRoot);
//     const clonedCoordinator = new Coordinator(clonedRoot);

//     // Map original node id => cloned node.
//     const clonedNodesMap = new Map<string, IResource>();
//     clonedNodesMap.set(originalRoot.id, clonedRoot);

//     const highestLevel = original.getHighestLevel();

//     // Process level by level (level 0 already handled as the root).
//     for (let level = 1; level <= highestLevel; level++) {
//         const nodesAtLevel = original.getNodesAtLevel(originalRoot.id, level);
//         nodesAtLevel.forEach(node => {
//             const clonedNode = cloneResource(node);
//             clonedNodesMap.set(node.id, clonedNode);
//             clonedCoordinator.addResource(clonedNode);
//         });
//     }

//     // Recreate edges based on original parent-child relationships.
//     clonedNodesMap.forEach((clonedNode, origId) => {
//         const children = original.getChildren(origId);
//         children.forEach(child => {
//             const clonedChild = clonedNodesMap.get(child.id);
//             if (clonedChild) {
//                 clonedCoordinator.addEdge(clonedNode.id, clonedChild.id);
//             }
//         });
//     });

//     return clonedCoordinator;
// }


/**
 * Asynchronously clones an entire Coordinator's DAG by processing nodes level by level.
 * Clones all nodes at a level concurrently, ensuring that all dependency nodes (at lower levels)
 * are already cloned. In this DAG, the highest level nodes (leaf nodes) are processed last.
 */
async function cloneGraphByLevelsAsync(original: Coordinator): Promise<Coordinator> {
    // Clone the root node (level 0).
    const originalRoot = original.getRoot();
    const clonedRoot = await cloneResource(originalRoot);
    const clonedCoordinator = new Coordinator(clonedRoot);

    // Map original node id => cloned node for later edge reconstruction.
    const clonedNodesMap = new Map<string, IResource>();
    clonedNodesMap.set(originalRoot.id, clonedRoot);

    const highestLevel = original.getHighestLevel();

    // Process levels from 1 to highestLevel. Lower level nodes (dependencies) are cloned first.
    for (let level = 1; level <= highestLevel; level++) {
        const nodesAtLevel = original.getNodesAtLevel(originalRoot.id, level);
        logger.info(`Cloning Level ${level} with ${nodesAtLevel.length} nodes...`);

        // Clone all nodes at this level concurrently.
        const clonesAtLevel = await Promise.all(nodesAtLevel.map(node => cloneResource(node)));
        clonesAtLevel.forEach((clonedNode, index) => {
            const origNode = nodesAtLevel[index];
            clonedNodesMap.set(origNode.id, clonedNode);
            clonedCoordinator.addResource(clonedNode);
        });
    }

    // Recreate edges based on original parent-child relationships.
    clonedNodesMap.forEach((clonedNode, origId) => {
        const children = original.getChildren(origId);
        children.forEach(child => {
            const clonedChild = clonedNodesMap.get(child.id);
            if (clonedChild) {
                clonedCoordinator.addEdge(clonedNode.id, clonedChild.id);
            }
        });
    });

    return clonedCoordinator;
}

async function cloneGraphByLevelsAsyncV2(original: Coordinator): Promise<Coordinator> {
    // Clone the nodes map to store all nodes before creating the coordinator
    const clonedNodesMap = new Map<string, IResource>();

    const highestLevel = original.getHighestLevel();
    const originalRoot = original.getRoot();

    // Process levels from highest to lowest (excluding root at level 0)
    for (let level = highestLevel; level > 0; level--) {
        const nodesAtLevel = original.getNodesAtLevel(originalRoot.id, level);
        logger.info(`Cloning Level ${level} with ${nodesAtLevel.length} nodes...`);

        // Clone all nodes at this level concurrently
        const clonesAtLevel = await Promise.all(nodesAtLevel.map(node => cloneResource(node)));
        clonesAtLevel.forEach((clonedNode, index) => {
            const origNode = nodesAtLevel[index];
            clonedNodesMap.set(origNode.id, clonedNode);
        });
    }

    // Clone the root last
    const clonedRoot = await cloneResource(originalRoot);
    clonedNodesMap.set(originalRoot.id, clonedRoot);

    // Create the coordinator with the root
    const clonedCoordinator = new Coordinator(clonedRoot);

    // Add all other nodes to the coordinator
    clonedNodesMap.forEach((node, id) => {
        if (id !== originalRoot.id) {
            clonedCoordinator.addResource(node);
        }
    });

    // Recreate edges based on original parent-child relationships
    clonedNodesMap.forEach((clonedNode, origId) => {
        const children = original.getChildren(origId);
        children.forEach(child => {
            const clonedChild = clonedNodesMap.get(child.id);
            if (clonedChild) {
                clonedCoordinator.addEdge(clonedNode.id, clonedChild.id);
            }
        });
    });

    return clonedCoordinator;
}

const testingData = {
    "organization": {
        "id": 1,
        "name": "Organization 1",
        "workflows": [
            {
                "id": 1,
                "name": "Workflow 1"
            },
            {
                "id": 2,
                "name": "Workflow 2"
            },
            {
                "id": 3,
                "name": "Workflow 3",
                "ai_assistants": [
                    1,
                    2
                ],
                "databoards": [
                    1,
                    2,
                    3
                ]
            },
            {
                "id": 4,
                "name": "Workflow 4"
            }
        ],
        "channels": [
            {
                "id": 1,
                "name": "Channel 1",
                "workflow": 1
            },
            {
                "id": 2,
                "name": "Channel 2",
                "workflow": 2
            },
            {
                "id": 3,
                "name": "Channel 3",
                "workflow": 1
            }
        ],
        "journeys": [
            {
                "id": 1,
                "name": "Journey 1",
                "workflow": 1,
                "databoard": 2
            },
            {
                "id": 2,
                "name": "Journey 2"
            },
            {
                "id": 3,
                "name": "Journey 3"
            }
        ],
        "ai_assistant": [
            {
                "id": 1,
                "name": "AI Assistant 1",
                "workflows": [
                    1,
                    2,
                    9,
                    3
                ],
                "databoards": [
                    1,
                    2
                ]
            },
            {
                "id": 2,
                "name": "AI Assistant 2",
                "workflows": [
                    2,
                    3
                ],
                "databoards": [
                    2,
                    3
                ]
            }
        ],
        "automations": [
            {
                "id": 1,
                "name": "Automation 1",
                "databoard": 1,
                "Workflow": 1
            },
            {
                "id": 2,
                "name": "Automation 2",
                "databoard": 2,
                "Workflow": 2
            },
            {
                "id": 3,
                "name": "Automation 3",
                "databoard": 3,
                "Workflow": 3
            }
        ],
        "databoards": [
            {
                "id": 1,
                "name": "Databoard 1"
            },
            {
                "id": 2,
                "name": "Databoard 2"
            },
            {
                "id": 3,
                "name": "Databoard 3"
            }
        ]
    }
};

// Invoke the functions to build and print the graph.
const templateGraph = buildGraphFromTestingData(testingData);
logger.info("Graph structure:");
printGraph(templateGraph, testingData.organization.id.toString());
logger.info("Highest Level:", templateGraph.getHighestLevel());

cloneGraphByLevelsAsyncV2(templateGraph).then(
    (result) => {
        logger.info("Cloned Graph structure:");
        printGraph(result, result.getRoot().id);
        logger.info("Cloned Highest Level:", result.getHighestLevel());
    }
);
// logger.info("Cloned Graph structure:");
// printGraph(clonedCoordinator, clonedCoordinator.getRoot().id);
// logger.info("Cloned Highest Level:", clonedCoordinator.getHighestLevel());