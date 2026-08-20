import logger from '../../../server/logging/logger';
/* eslint-disable @typescript-eslint/no-explicit-any */
import TemplateGraph from "./TemplateGraph";
import { IResource } from "./interface";

export class Coordinator {
    // Store the root node.
    private root: IResource;
    // We use the resource's id as the unique key.
    private dag: TemplateGraph<IResource> = new TemplateGraph<IResource>(node => node.id);
    // Map to track each node's level (distance from root)
    private nodeLevels = new Map<string, number>();
    // Highest level reached so far (0 means just the root)
    private highestLevel: number = 0;

    constructor(rootData: IResource) {
        this.root = rootData;
        // Add the root node and set its level to 0.
        this.dag.addNode(rootData);
        this.nodeLevels.set(rootData.id, 0);
    }

    addResource(resource: IResource): void {
        // Add resource if it isn't already added.
        this.dag.addNode(resource);
        // If not connected yet, we leave its level undefined.
        if (!this.nodeLevels.has(resource.id)) {
            this.nodeLevels.set(resource.id, -1);
        }
    }

    // Example usage in addEdge (you can decide when to call this batch update).
    addEdge(parentId: string, childId: string): void {
        if (!this.dag.addEdge(parentId, childId)) {
            logger.error(`Edge not added: ${parentId} -> ${childId}`);
            return;
        }
        // Get parent's level (must be defined).
        const parentLevel = this.nodeLevels.get(parentId);
        if (parentLevel === undefined) {
            logger.error(`Parent level for ${parentId} not found.`);
            return;
        }
        const candidateLevel = parentLevel + 1;
        const currentChildLevel = this.nodeLevels.get(childId) ?? -1;
        if (candidateLevel > currentChildLevel) {
            // Instead of processing each descendant individually (with a queue),
            // batch-update in levels using getNodesAtLevel.
            this.updateChildLevelsBatch(childId, candidateLevel);
        }
    }

    // Batch-update levels using getNodesAtLevel.
    private updateChildLevelsBatch(rootId: string, startLevel: number): void {
        let offset = 0;
        // Process nodes level by level starting from rootId.
        let nodesAtThisOffset = this.getNodesAtLevel(rootId, offset);
        while (nodesAtThisOffset.length > 0) {
            const newLevel = startLevel + offset;
            nodesAtThisOffset.forEach(node => {
                const existingLevel = this.nodeLevels.get(node.id) ?? -1;
                if (newLevel > existingLevel) {
                    this.nodeLevels.set(node.id, newLevel);
                }
            });
            if (newLevel > this.highestLevel) {
                this.highestLevel = newLevel;
            }
            offset++;
            nodesAtThisOffset = this.getNodesAtLevel(rootId, offset);
        }
    }

    // Find a resource node by id.
    findResource(id: string): IResource | undefined {
        return this.dag.findNode(id);
    }

    getNodesStartingWith(prefix: string): IResource[] {
        return this.dag.getNodesStartingWith(prefix);
    }

    // Get children of a resource.
    getChildren(id: string): IResource[] {
        return this.dag.getChildren(id);
    }



    // Get all nodes at a specific level (starting from a given root id).
    getNodesAtLevel(rootId: string, level: number): IResource[] {
        return this.dag.getNodesAtLevel(rootId, level);
    }

    getNodesAtLevelWithoutCutoff(rootId: string, level: number): IResource[] {
        return this.dag.getNodesAtLevelWithoutCutoff(rootId, level);
    }

    // Return the highest level reached in the DAG.
    getHighestLevel(): number {
        return this.highestLevel;
    }

    // New method to get the root node.
    getRoot(): IResource {
        return this.root;
    }

    static deserialize(data: any): Coordinator {
        // Determine the root.
        // If data.root exists, you might use it; otherwise pick the resource with type "organization"
        let rootResource: IResource;
        if (data.root) {
            // Use the provided root and remove it from resources if present.
            rootResource = {
                id: data.root.id,
                name: data.root.name,
                type: data.root.type,
                data: data.root.data,
            };
        } else if (data.resources && data.resources.length > 0) {
            // Pick the first resource with type "organization" as root,
            // Or fallback to the first resource.
            const orgRes = data.resources.find((res: any) => res.type === "organization");
            rootResource = orgRes ? {
                id: orgRes.id,
                name: orgRes.name,
                type: orgRes.type,
                data: orgRes.data
            } : {
                id: data.resources[0].id,
                name: data.resources[0].name,
                type: data.resources[0].type,
                data: data.resources[0].data
            };
        } else {
            throw new Error("No resources available for deserialization");
        }

        // Create the Coordinator using the chosen root.
        const coordinator = new Coordinator(rootResource);

        // Include all resources from the saved data.
        if (data.resources) {
            data.resources.forEach((resource: any) => {
                // Optionally skip adding the organization twice.
                if (resource.id === rootResource.id) return;
                const res: IResource = {
                    id: resource.id,
                    name: resource.name,
                    type: resource.type,
                    data: resource.data,
                };
                // Avoid duplicates if already added.
                if (!coordinator.findResource(res.id)) {
                    coordinator.addResource(res);
                }
            });
        }

        // Recreate the edges.
        if (data.edges) {
            data.edges.forEach((edge: any) => {
                coordinator.addEdge(edge.parentId, edge.childId);
            });
        }

        return coordinator;
    }
}