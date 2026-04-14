import inquirer from 'inquirer';

export async function ask(message, type = 'confirm') {
  return await inquirer.prompt([{ type, name: 'ask', message }]).then(res => res.ask)
}