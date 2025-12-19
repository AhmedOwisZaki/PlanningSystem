import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EPSNode } from '../models/planning.models';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class EPSService {
    private readonly STORAGE_KEY = 'eps_structure';
    private epsNodesSubject = new BehaviorSubject<EPSNode[]>([]);
    epsNodes$ = this.epsNodesSubject.asObservable();

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private apiService: ApiService
    ) {
        if (isPlatformBrowser(this.platformId)) {
            this.loadEPS();
        }
    }

    private loadEPS() {
        // Load EPS from backend API
        this.apiService.getEPS().subscribe({
            next: (nodes) => {
                const tree = this.listToTree(nodes);
                this.epsNodesSubject.next(tree);
            },
            error: (error) => {
                console.error('Failed to load EPS from API:', error);
                // Fallback to default if API fails
                this.initializeDefaultEPS();
            }
        });
    }

    private listToTree(list: any[]): EPSNode[] {
        const map: { [key: string]: any } = {};
        const roots: any[] = [];

        list.forEach(node => {
            map[node.id] = { ...node, children: [] };
        });

        list.forEach(node => {
            if (node.parentId && node.parentId !== 'EPS-ROOT' && map[node.parentId]) {
                map[node.parentId].children.push(map[node.id]);
            } else {
                roots.push(map[node.id]);
            }
        });

        return roots;
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
        this.apiService.createEPS(node).subscribe({
            next: (createdNode) => {
                const currentNodes = this.getEPSNodes();

                if (createdNode.parentId) {
                    const updatedNodes = this.addChildToNode(currentNodes, createdNode.parentId, createdNode);
                    this.epsNodesSubject.next(updatedNodes);
                } else {
                    this.epsNodesSubject.next([...currentNodes, createdNode]);
                }
            },
            error: (error) => {
                console.error('Failed to create EPS node:', error);
                alert('Failed to create EPS node. Please try again.');
            }
        });
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
        this.apiService.updateEPS(updatedNode.id, updatedNode).subscribe({
            next: () => {
                const currentNodes = this.getEPSNodes();
                const newNodes = this.updateNodeInTree(currentNodes, updatedNode);
                this.saveEPS(newNodes);
            },
            error: (error) => {
                console.error('Failed to update EPS node:', error);
                alert('Failed to update EPS node. Please try again.');
            }
        });
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
        this.apiService.deleteEPS(nodeId).subscribe({
            next: () => {
                const currentNodes = this.getEPSNodes();
                const newNodes = this.deleteNodeFromTree(currentNodes, nodeId);
                this.epsNodesSubject.next(newNodes);
            },
            error: (error) => {
                console.error('Failed to delete EPS node:', error);
                alert('Failed to delete EPS node. Please try again.');
            }
        });
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
