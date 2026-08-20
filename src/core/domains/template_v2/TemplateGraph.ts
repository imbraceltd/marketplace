import logger from '../../../server/logging/logger';
export default class TemplateGraph<T> {
    private nodes = new Map<string, T>();
    private edges = new Map<string, Set<string>>();

    // getId function is used to extract the unique id from a node
    constructor(private getId: (node: T) => string) { }

    addNode(node: T): void {
        const id = this.getId(node);
        if (!this.nodes.has(id)) {
            this.nodes.set(id, node);
            this.edges.set(id, new Set<string>());
        }
    }

    // Adds a directed edge from parentId to childId.
    // Returns true if the edge was added, false if it would introduce a cycle.
    addEdge(parentId: string, childId: string): boolean {
        if (!this.nodes.has(parentId) || !this.nodes.has(childId)) {
            logger.info(`Node ${parentId} or ${childId} not found.`);
            logger.info(`Nodes: ${Array.from(this.nodes.keys())}`);
            throw new Error("Both nodes must be added before linking them.");
        }
        // Check for cycle: if there's already a path from child to parent, adding the edge would create a cycle.
        if (this.hasPath(childId, parentId)) {
            logger.error(`Adding edge from ${parentId} to ${childId} would create a cycle.`);
            return false;
        }
        this.edges.get(parentId)!.add(childId);
        return true;
    }

    // Returns true if there is a path from sourceId to targetId.
    private hasPath(sourceId: string, targetId: string, visited: Set<string> = new Set()): boolean {
        if (sourceId === targetId) return true;
        visited.add(sourceId);
        for (const childId of this.edges.get(sourceId) || []) {
            if (!visited.has(childId)) {
                if (this.hasPath(childId, targetId, visited)) {
                    return true;
                }
            }
        }
        return false;
    }

    // Find a node by id.
    findNode(id: string): T | undefined {
        return this.nodes.get(id);
    }


    getNodesStartingWith(prefix: string): T[] {
        const result: T[] = [];
        for (const [id, node] of this.nodes.entries()) {
            if (id.startsWith(prefix)) {
                result.push(node);
            }
        }
        return result;
    }

    // Get all children of a given node id.
    getChildren(parentId: string): T[] {
        const childIds = this.edges.get(parentId);
        if (!childIds) return [];
        return Array.from(childIds).map(id => this.nodes.get(id)!);
    }

    // (Optional) Compute nodes at a specific "level" using breadth-first search.
    // Note: In a TemplateGraph, a node may be reachable via paths of different lengths.
    // Here we compute the shortest path length from a given rootId.
    getNodesAtLevel(rootId: string, level: number): T[] {
        const result: T[] = [];
        const queue: { id: string; currentLevel: number }[] = [{ id: rootId, currentLevel: 0 }];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const { id, currentLevel } = queue.shift()!;
            if (currentLevel === level) {
                result.push(this.nodes.get(id)!);
            }
            // Only add if currentLevel is less than desired level.
            if (currentLevel < level) {
                for (const childId of this.edges.get(id) || []) {
                    // To allow multiple paths (we want the shortest level),
                    // only add if not yet visited.
                    if (!visited.has(childId)) {
                        visited.add(childId);
                        queue.push({ id: childId, currentLevel: currentLevel + 1 });
                    }
                }
            }
        }
        return result;
    }


    getNodesAtLevelWithoutCutoff(rootId: string, level: number): T[] {
        const result: T[] = [];
        const queue: { id: string; currentLevel: number }[] = [{ id: rootId, currentLevel: 0 }];

        // Allow revisiting nodes (which might result in duplicates)
        while (queue.length > 0) {
            const { id, currentLevel } = queue.shift()!;
            if (currentLevel === level) {
                result.push(this.nodes.get(id)!);
            }
            if (currentLevel < level) {
                for (const childId of this.edges.get(id) || []) {
                    queue.push({ id: childId, currentLevel: currentLevel + 1 });
                }
            }
        }

        // Deduplicate results based on each node's unique id.
        const uniqueNodes = new Map<string, T>();
        for (const node of result) {
            const id = this.getId(node);
            if (!uniqueNodes.has(id)) {
                uniqueNodes.set(id, node);
            }
        }
        return Array.from(uniqueNodes.values());
    }
}