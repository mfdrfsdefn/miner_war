
use bolt_lang::*;
use std::str::FromStr;
use map::Map;
use prizepool::Prizepool;
declare_id!("ESGndWFErYWf68ASK75vctW6EvHvWHemHcQSmrjdgCHN");

#[error_code]
pub enum Error {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Authority not found.")]
    AuthorityNotFound,
    #[msg("Account not found.")]
    AccountNotFound,
}

#[system]
pub mod init_prizepool {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let prizepool = &mut ctx.accounts.prizepool;
        let map = &mut ctx.accounts.map;
        let user_authority = *ctx.accounts.authority.key;
        
        match map.authority {
            Some(authority) => {
                require!(user_authority == authority, Error::NotAuthorized);
            }
            None => {
                return Err(Error::AuthorityNotFound.into());
            }
        }

        prizepool.map = Some(map.key()); 
        prizepool.buy_in=map.buy_in;
        prizepool.token_decimals = match args.token_decimals {
            Some(token_decimals) => Some(token_decimals as u32),
            None => None,
        };
        prizepool.vault_token_account = match args.vault_token_account_string {
            Some(ref vault_token_account_str) => Some(Pubkey::from_str(vault_token_account_str).map_err(|_| Error::AccountNotFound)?),
            None => None,
        };
        prizepool.token = match args.token_string {
            Some(ref token_str) => Some(Pubkey::from_str(token_str).map_err(|_| Error::AccountNotFound)?),
            None => None,
        };
        prizepool.gamecreater_token_account = match args.gamecreater_wallet_string {
            Some(ref gamecreater_wallet_str) => Some(Pubkey::from_str(gamecreater_wallet_str).map_err(|_| Error::AccountNotFound)?),
            None => None,
        };

        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub prizepool:Prizepool,
        pub map: Map,
    }

    #[arguments]
    struct Args {
        vault_token_account_string: Option<String>,
        token_string: Option<String>,
        token_decimals: Option<u8>,
        gamecreater_wallet_string: Option<String>,
    }
}