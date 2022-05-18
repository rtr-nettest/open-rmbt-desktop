import { config } from "dotenv"

export function main() {
  config({
    path: process.env.DOTENV_CONFIG_PATH || ".env",
  })

  console.log(process.env)
}

main()
