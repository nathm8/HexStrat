import * as GameLogic from "./GameLogic.mjs";
import {shuffle} from "./misc/utilities.mjs";

// return all actions until we end our turn
export function MCTS(root, time)
{
    var start_time = Date.now();
    while ((Date.now() - start_time) < 1000*time)
    {
        var leaf = root.traverse();
        var result = leaf.simulate();
        leaf.backpropagate(result);
    }
    var node = root.bestChild();
    var actions = [node.state.action];
    while (node.state.action.type != GameLogic.end_turn && node.children.length != 0)
    {
        node = node.bestChild();
        actions.push(node.state.action);
    }
    if (actions[actions.length-1].type != GameLogic.end_turn)
    {
        actions.push({type: GameLogic.end_turn});
    }
    return actions;
}

export class MonteCarloTreeSearchNode
{
    constructor(parent, state, player_id)
    {
        this.player_id = player_id;

        this.state = state;
        this.reward = 0;       
        this.backpropagation_visits = 0;       
        this.parent = parent;
        
        // store valid positions from here but don't actually create child nodes until we need to
        this.unexpandedChildren = this.state.getValidMoves();
        this.children = [];
    }

    getUpperConfidenceBound()
    {
        return this.reward/this.backpropagation_visits + Math.sqrt( Math.log(this.parent.backpropagation_visits) / this.backpropagation_visits);
    }

    getBestUpperConfidenceBoundChild()
    {
        var best_child = this.children[0];
        var best_uct = best_child.getUpperConfidenceBound();
        for (var i=1; i<this.children.length; i++)
        {
            var uct = this.children[i].getUpperConfidenceBound();
            if (uct > best_uct)
                best_child = this.children[i];
        }
        return best_child;
    }

    // 
    traverse()
    {
        if (this.fullyExpanded())
            return this.getBestUpperConfidenceBoundChild().traverse();
        if (this.state.gameOver)
            return this;
        return this.pickUnexpandedChild();
    }

    // create a new child
    pickUnexpandedChild()
    {
        var chosen = GameLogic.heuristic(this.unexpandedChildren, this.player_id);
        var i = this.unexpandedChildren.indexOf(chosen);
        this.unexpandedChildren.splice(i, 1);

        var child = new MonteCarloTreeSearchNode(this, chosen, this.player_id);
        this.children.push(child);
        return child;
    }

    // if any child has not been visited or not yet created, we are not fully expanded
    fullyExpanded()
    {
        return this.unexpandedChildren.length == 0;
    }

    // run game till gameOver from this node, return the result for this player
    simulate()
    {
        return this.state.simulate(this.player_id);
    }

    backpropagate(value)
    {
        this.reward += value;
        this.backpropagation_visits++;
        if (this.parent != null)
        {
            this.parent.backpropagate(value);
        }
    }

    // return most visited child
    bestChild()
    {
        var best = this.children[0];
        for (var i=1; i<this.children.length; i++)
            if (this.children[i].backpropagation_visits > best.backpropagation_visits)
                best = this.children[i];
        return best;
    }
}