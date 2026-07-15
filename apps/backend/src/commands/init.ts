import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { Logger } from "@orion/shared";
import { StateManager } from "@orion/infrastructure";

const logger = new Logger({ prefix: "init" });

interface InitAnswers {
  provider: string;
  architecture: string;
  parallelAgents: number;
}

export function initCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize Orion in the current project")
    .option("-y, --yes", "Skip prompts and use defaults")
    .action(async (options: { yes?: boolean }) => {
      console.log(chalk.bold.cyan("\n  Orion CLI - Project Initialization\n"));

      let answers: InitAnswers;

      if (options.yes) {
        answers = {
          provider: "openai",
          architecture: "ddd",
          parallelAgents: 4,
        };
        console.log(chalk.dim("  Using defaults...\n"));
      } else {
        answers = await inquirer.prompt([
          {
            type: "list",
            name: "provider",
            message: "Select LLM provider:",
            choices: ["openai", "anthropic", "ollama", "gemini"],
            default: "openai",
          },
          {
            type: "list",
            name: "architecture",
            message: "Select architecture pattern:",
            choices: ["ddd", "clean", "mvc", "layered"],
            default: "ddd",
          },
          {
            type: "number",
            name: "parallelAgents",
            message: "Max parallel agents:",
            default: 4,
          },
        ]);
      }

      const spinner = ora("Initializing project...").start();

      try {
        const stateManager = new StateManager(process.cwd());

        spinner.text = "Writing configuration...";
        await stateManager.write("config.json", {
          provider: answers.provider,
          architecture: answers.architecture,
          parallelAgents: answers.parallelAgents,
          initializedAt: new Date().toISOString(),
        });

        spinner.succeed(chalk.green("Project initialized successfully!"));

        console.log(chalk.bold("\n  Configuration:"));
        console.log(chalk.dim("  ──────────────"));
        console.log(`  Provider:    ${chalk.white(answers.provider)}`);
        console.log(`  Architecture:${chalk.white(answers.architecture)}`);
        console.log(`  Agents:      ${chalk.white(answers.parallelAgents)} max parallel`);
        console.log();
      } catch (error) {
        spinner.fail(chalk.red("Initialization failed"));
        logger.error("Init error:", error);
        process.exit(1);
      }
    });
}
