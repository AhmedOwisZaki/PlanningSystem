import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EPSNode } from '../models/planning.models';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class EPSService {
    private readonly STORAGE_KEY = 'eps_structure';
    private epsNodesSubject = new BehaviorSubject<EPSNode[]>([]);
    epsNodes$ = this.epsNodesSubject.asObservable();

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        if (isPlatformBrowser(this.platformId)) {
            this.loadEPS();
        }
    }

    private loadEPS() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                const nodes = JSON.parse(saved);
                this.epsNodesSubject.next(nodes);
            } catch (e) {
                console.error('Failed to parse EPS structure', e);
                this.initializeDefaultEPS();
            }
        } else {
            this.initializeDefaultEPS();
        }
    }

    private initializeDefaultEPS() {
        // Create a root node if nothing exists
        const defaultRoot: EPSNode = {
            id: 'EPS-ROOT',
            name: 'Enterprise',
            parentId: null,
            children: []
        };
        this.saveEPS([defaultRoot]);
    }

    private saveEPS(nodes: EPSNode[]) {
        this.epsNodesSubject.next(nodes);
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nodes));
        }
    }

    getEPSNodes(): EPSNode[] {
        return this.epsNodesSubject.value;
    }

    // Returns a flat list of all nodes
    getAllNodesFlat(): EPSNode[] {
        const result: EPSNode[] = [];
        const traverse = (nodes: EPSNode[]) => {
            for (const node of nodes) {
                result.push({ ...node, children: undefined }); // Push copy without children recursion
                if (node.children) {
                    traverse(node.children);
                }
            }
        };
        traverse(this.epsNodesSubject.value);
        return result;
    }

    addEPSNode(node: EPSNode) {
        const currentNodes = this.getEPSNodes();

        if (node.parentId) {
            // Find parent and add to its children
            const updatedNodes = this.addChildToNode(currentNodes, node.parentId, node);
            this.saveEPS(updatedNodes);
        } else {
            // Add as root
            this.saveEPS([...currentNodes, node]);
        }
    }

    private addChildToNode(nodes: EPSNode[], parentId: string, newNode: EPSNode): EPSNode[] {
        return nodes.map(node => {
            if (node.id === parentId) {
                return {
                    ...node,
                    children: [...(node.children || []), newNode]
                };
            } else if (node.children) {
                return {
                    ...node,
                    children: this.addChildToNode(node.children, parentId, newNode)
                };
            }
            return node;
        });
    }

    updateEPSNode(updatedNode: EPSNode) {
        const currentNodes = this.getEPSNodes();
        const newNodes = this.updateNodeInTree(currentNodes, updatedNode);
        this.saveEPS(newNodes);
    }

    private updateNodeInTree(nodes: EPSNode[], updatedNode: EPSNode): EPSNode[] {
        return nodes.map(node => {
            if (node.id === updatedNode.id) {
                // Update properties but keep children intact unless specifically modifying them
                return { ...node, ...updatedNode, children: node.children };
            } else if (node.children) {
                return {
                    ...node,
                    children: this.updateNodeInTree(node.children, updatedNode)
                };
            }
            return node;
        });
    }

    deleteEPSNode(nodeId: string) {
        const currentNodes = this.getEPSNodes();
        const newNodes = this.deleteNodeFromTree(currentNodes, nodeId);
        this.saveEPS(newNodes);
    }

    private deleteNodeFromTree(nodes: EPSNode[], nodeId: string): EPSNode[] {
        return nodes
            .filter(node => node.id !== nodeId)
            .map(node => {
                if (node.children) {
                    return {
                        ...node,
                        children: this.deleteNodeFromTree(node.children, nodeId)
                    };
                }
                return node;
            });
    }
}
