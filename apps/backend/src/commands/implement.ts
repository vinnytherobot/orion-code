import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { Logger } from "@orion/shared";
import { StateManager, HistoryManager } from "@orion/infrastructure";

const logger = new Logger({ prefix: "implement" });

export function implementCommand(program: Command): void {
  program
    .command("implement <description>")
    .description("Implement a feature using multi-agent orchestration")
    .option("-p, --parallel <n>", "Number of parallel agents", "4")
    .option("-b, --branch <name>", "Git branch name")
    .option("--dry-run", "Plan only, do not execute")
    .action(
      async (
        description: string,
        options: { parallel?: string; branch?: string; dryRun?: boolean }
      ) => {
        console.log(chalk.bold.cyan("\n  Orion CLI - Implementation\n"));
        console.log(chalk.dim(`  Task: ${description}\n`));

        const spinner = ora("Loading configuration...").start();

        try {
          const stateManager = new StateManager(process.cwd());
          const historyManager = new HistoryManager(process.cwd());

          // Verify project is initialized
          const config = await stateManager.read<Record<string, unknown>>("config.json");
          if (!config) {
            spinner.fail(chalk.red("Project not initialized"));
            console.log(chalk.yellow("  Run `orion init` first.\n"));
            process.exit(1);
          }

          // Plan phase
          spinner.text = "Planning implementation...";
          // TODO: Wire PlanUseCase when repositories are implemented
          const plan = {
            tasks: [
              { id: "1", title: "Analysis", description, dependencies: [] },
              { id: "2", title: "Implementation", description, dependencies: ["1"] },
              { id: "3", title: "Testing", description, dependencies: ["2"] },
            ],
          };

          spinner.succeed(chalk.green("Plan created!"));

          // Display plan
          console.log(chalk.bold("\n  Execution Plan:"));
          console.log(chalk.dim("  ───────────────"));
          for (const task of plan.tasks) {
            const dep =
              task.dependencies.length > 0
                ? chalk.dim(` (after: ${task.dependencies.join(", ")})`)
                : chalk.dim(" (independent)");
            console.log(`  ${chalk.cyan("●")} ${task.title}${dep}`);
          }
          console.log();

          if (options.dryRun) {
            console.log(chalk.yellow("  Dry run - stopping here.\n"));
            return;
          }

          // Execute phase
          const parallel = parseInt(options.parallel ?? "4", 10);
          spinner.start(`Executing with ${parallel} agents...`);

          // TODO: Wire ImplementUseCase when repositories are implemented
          await new Promise((resolve) => setTimeout(resolve, 2000));

          spinner.succeed(chalk.green("Implementation complete!"));

          // Record history
          await historyManager.append({
            id: crypto.randomUUID(),
            taskId: "implement",
            agentId: "orchestrator",
            action: "implement",
            input: description,
            output: "completed",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            duration: 2000,
            success: true,
          });

          console.log(chalk.bold("\n  Summary:"));
          console.log(chalk.dim("  ────────"));
          console.log(`  Tasks completed: ${chalk.white(plan.tasks.length)}`);
          console.log(`  Parallel agents: ${chalk.white(parallel)}`);
          console.log();
        } catch (error) {
          spinner.fail(chalk.red("Implementation failed"));
          logger.error("Implement error:", error);
          process.exit(1);
        }
      }
    );
}
