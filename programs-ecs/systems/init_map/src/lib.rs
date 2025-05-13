use bolt_lang::*;
use map::Map;
declare_id!("36K9kUECFsZrnsDeuD49biyHrtwptL48TfCgDf689h7H");
#[error_code]
pub enum Error {
    #[msg("Wallet not authorized.")]
    NotAuthorized,

}
    #[system]
pub mod init_map {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let map = &mut ctx.accounts.map;
        let user_authority = *ctx.accounts.authority.key;

        match map.authority {
            Some(authority) => {require!(user_authority == authority, Error::NotAuthorized);}
            None => {map.authority = Some(user_authority);}
        }

        map.buy_in = args.buy_in;
        Ok(ctx.accounts)
    }
    #[system_input]
    pub struct Components {
        pub map: Map,
    }

    #[arguments]
    struct Args {
        buy_in: f64,
        
    }
}