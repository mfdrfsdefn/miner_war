use bolt_lang::prelude::*;

declare_id!("ETspbWudbuMGNh3d5EGK9oEFi1zrHRjy5d7ic4haYAwA");

const DISCRIMINATOR: usize = 8;

#[program]
pub mod miner_war {
    use super::*;

    pub fn new_game(ctx: Context<NewGame>, id: u32, name: String, owner: Pubkey) -> Result<()> {
        let games = &mut ctx.accounts.games;
        games.list.push(Game {
            id,
            name,
            owner,
            status: GameStatus::Created,
        });
        Ok(())
    }

    pub fn remove_game(ctx: Context<UpdateGame>, id: u32) -> Result<()> {
        let games = &mut ctx.accounts.games;
        games.list = games
            .list
            .clone()
            .into_iter()
            .filter(|x| x.id != id)
            .collect();
        Ok(())
    }

    pub fn game_started(ctx: Context<UpdateGame>, id: u32) -> Result<()> {
        let games: &mut Account<'_, Games> = &mut ctx.accounts.games;
        if let Some(game) = games.list.iter_mut().find(|game| game.id == id) {
            game.status = GameStatus::Started;
        } else {
            return Err(error!(MinerWarError::GameNotFound));
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct UpdateGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub games: Account<'info, Games>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NewGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init_if_needed, payer = payer, seeds = [b"games"], bump, space = DISCRIMINATOR + Games::INIT_SPACE )]
    pub games: Account<'info, Games>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Games {
    #[max_len(20)]
    pub list: Vec<Game>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, InitSpace)]
pub struct Game {
    id: u32,
    #[max_len(20)]
    name: String,
    status: GameStatus,
    #[max_len(20)]
    owner: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, InitSpace)]
pub enum GameStatus {
    Created,
    Started,
}

#[error_code]
pub enum MinerWarError {
    #[msg("The specified game was not found")]
    GameNotFound,
}
