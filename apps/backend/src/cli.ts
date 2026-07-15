#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "./commands/init.js";
import { implementCommand } from "./commands/implement.js";
import { reviewCommand } from "./commands/review.js";
import { testCommand } from "./commands/test.js";
import { docsCommand } from "./commands/docs.js";
import { releaseCommand } from "./commands/release.js";

const VERSION = "0.1.0";

export function createCli(): Command {
  const program = new Command();

  program
    .name("orion")
    .description(chalk.cyan("Orion CLI - Multi-Agent Orchestrator"))
    .version(VERSION, "-v, --version", "Display version number");

  // Register commands
  initCommand(program);
  implementCommand(program);
  reviewCommand(program);
  testCommand(program);
  docsCommand(program);
  releaseCommand(program);

  // Help customization
  program.addHelpText(
    "after",
    `
${chalk.bold("Examples:")}
  ${chalk.dim("$")} orion init
  ${chalk.dim("$")} orion implement "Add JWT authentication"
  ${chalk.dim("$")} orion review
  ${chalk.dim("$")} orion test
  ${chalk.dim("$")} orion docs
  ${chalk.dim("$")} orion release
`
  );

  return program;
}

// Entry point
const program = createCli();
program.parse(process.argv);
