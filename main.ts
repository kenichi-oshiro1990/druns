import { getInput, info, setFailed } from "@actions/core";
import { Octokit } from "@octokit/rest";

const authToken = getInput("token");
const ownerRepo = getInput("ownerRepo");
const existsCount = getInput("existsCount");
const per_page = 100;

const main = async () => {

    try {
        const remainingCount = parseInt(existsCount) < 3 ? 3 : parseInt(existsCount);
        const spliter = ownerRepo.split('/');
        const owner = spliter[0];
        const repo = spliter[1];

        const appOctokit = new Octokit({
            auth: authToken,
        });

        info("*** listWorkflowRunsForRepo:Start ***");

        const resWorkflows = await appOctokit.rest.actions.listWorkflowRunsForRepo({
            owner,
            repo,
            per_page
        });
        info("*** listWorkflowRunsForRepo:  End ***" + "\r\n");
        
        const counter = resWorkflows.data.total_count;
        info("*** WorkflowRuns count:" +  counter.toString() + " ***" + "\r\n");

        if (counter <= 1 ) {
            info("Processing will be canceled because it will delete its own Workflow.");
            return;
        }

        // ページ数の取得
        // per_page = 100 で取っているので1ページに100Workflowが載ってくる。
        const forCounter = Math.floor(counter/per_page) + (counter % per_page > 0 ? 1 : 0);

        let mergeWorkflow : Array <WorkFlowItem> = new Array();
        
        await resWorkflows.data.workflow_runs.forEach(value => {
            const item : WorkFlowItem = {id : value.id, updatedAt: value.updated_at}
            mergeWorkflow.push(item);
        })

        for(let i = 2; i <= forCounter; i++){
            const resNextPageWorkflows = await appOctokit.rest.actions.listWorkflowRunsForRepo({
                owner,
                repo,
                per_page,
                page : i
            });

            resNextPageWorkflows.data.workflow_runs.forEach(value => {
                const item : WorkFlowItem = {id : value.id, updatedAt: value.updated_at}
                mergeWorkflow.push(item);
            }) 
        }

        const sortedWorkflows = mergeWorkflow.sort(function (a, b) {
            if (a.updatedAt === null) return 0;
            if (b.updatedAt === null) return 0;
            if (a.updatedAt > b.updatedAt) return 1;
            if (a.updatedAt < b.updatedAt) return -1;
            return 0;
        });

        info("*** Sorted Workflows:Start ***");
        sortedWorkflows.forEach(function(workflow){
            info("id: " + workflow.id.toString() + "\t" + "update_at: " + workflow.updatedAt)
        });  
        info("*** Sorted Workflows:  End ***" + "\r\n");
 
        info("*** Delete Workflows Count:" + (counter - remainingCount).toString() + " ***");

        info("*** listWorkflowsArray Loop:Start ***");
        
        for (let i = 0; i < counter - remainingCount; i++) {

            const run_id : number= sortedWorkflows[i].id;
            info("id:" + run_id.toString() + "\t" + "update_at:" + sortedWorkflows[i].updatedAt || "null");
        
            await appOctokit.rest.actions.deleteWorkflowRun({
                owner,
                repo,
                run_id
            })
        }

        info("*** listWorkflowsArray Loop:  End ***" + "\r\n");
    }
    catch (error: any) {
        setFailed(error.message)
    }
};

main();

interface WorkFlowItem{
    id : number,
    updatedAt: string
}
