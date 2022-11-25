import { getInput, info, setFailed } from "@actions/core";
import { Octokit } from "@octokit/rest";

const authToken = getInput("token");
const ownerRepo = getInput("ownerRepo");
const existsCount = getInput("existsCount");

const main = async () => {

    try {
        const remainingCount = parseInt(existsCount);
        const spliter = ownerRepo.split('/');
        const owner = spliter[0];
        const repo = spliter[1];

        const appOctokit = new Octokit({
            auth: authToken,
        });

        info("*** listWorkflowRunsForRepo:Start ***");

        const resWorkflows = await appOctokit.rest.actions.listWorkflowRunsForRepo({
            owner,
            repo
        });

        const counter = resWorkflows.data.total_count;

        info("*** listWorkflowRunsForRepo:  End ***" + "\r\n");
        info("*** WorkflowRuns count:" +  counter.toString() + " ***" + "\r\n");

        const sortedWorkflows = resWorkflows.data.workflow_runs.sort(function (a, b) {
            if (a.updated_at === null) return 0;
            if (b.updated_at === null) return 0;
            if (a.updated_at > b.updated_at) return 1;
            if (a.updated_at < b.updated_at) return -1;
            return 0;
        });


        info("*** Sorted Workflows:Start ***" + "\r\n");
        sortedWorkflows.forEach(function(workflow){
            info("id:" + workflow.id.toString() + "\r\n" + "update_at:" + workflow.updated_at + "\r\n")
        });  
        info("*** Sorted Workflows:  End ***" + "\r\n");

 
        info("*** Delete Workflows Count:" + (counter - remainingCount).toString() + " ***");

        info("*** listWorkflowsArray Loop:Start ***");

        for (let i = 0; i < counter - remainingCount; i++) {

            const run_id : number= sortedWorkflows[i].id;
            info("id:" + run_id.toString());
            info("update_at:" + sortedWorkflows[i].updated_at + "\r\n" || "null" + "\r\n");
        
            await appOctokit.rest.actions.deleteWorkflowRunLogs({
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
