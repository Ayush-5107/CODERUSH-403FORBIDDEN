export default class PathfindingAlgorithm {
    constructor() {
        this.startNode = null;
        this.endNode = null;
        this.finished = false;
    }

    start(startNode, endNode) {
        this.startNode = startNode;
        this.endNode = endNode;
        this.finished = false;
    }

    nextStep() {
        this.finished = true;
        return [];
    }
}
