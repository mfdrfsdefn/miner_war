use bolt_lang::*;
use player::Player;
use map::Map;
declare_id!("GPRFeHp9j5miMk5A5YXCcKBf7eCGAt73UR5Zb4c126ys");

#[error_code]
pub enum Error {
    #[msg("Wallet not authorized.")]
    NotAuthorized,
    #[msg("Authority not found.")]
    AuthorityNotFound,
}

#[system]
pub mod init_player {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let player = &mut ctx.accounts.player;
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

        player.map = Some(map.key()); 

        Ok(ctx.accounts)
    }


    #[system_input]
    pub struct Components {
        pub player: Player,
        pub map:Map,
    }

}

