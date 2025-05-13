use bolt_lang::*;
use map::Map;
use player::Player;
use prizepool::Prizepool;
use anchor_spl::token::{TokenAccount, Transfer};
use std::str::FromStr;
declare_id!("A4qZibJ3rUGd9izgHXX5tapbRbhbT7Xu8u29RzKsuTp8");
#[error_code]
pub enum Error {
    #[msg("Not owner of this player.")] NotOwner,
    #[msg("Game Not Over")] GameNotOver,
    #[msg("Invalid game vault.")] InvalidGameVault,
    #[msg("Payout account mismatch.")] InvalidPayoutAccount,
    #[msg("Invalid pda.")] InvalidPda,
    #[msg("Invalid game vault owner.")] InvalidGameVaultOwner,
    #[msg("Invalid supersize payout account.")] InvalidSupersizeTokenAccount,
    #[msg("Invalid game owner payout account.")] InvalidGameOwnerTokenAccount,
    #[msg("Token decimals not set.")] MissingTokenDecimals,
    #[msg("Token mint mismatch.")] InvalidMint,
    #[msg("Component doesn't belong to map.")] MapKeyMismatch,
    #[msg("Invalid Buddy Link Program.")] InvalidBuddyLinkProgram,
}

#[system]
pub mod cash_out {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let authority = *ctx.accounts.authority.key;

        require!(ctx.accounts.player.map == ctx.accounts.prizepool.map, Error::MapKeyMismatch);
        require!(ctx.accounts.map.game_time == 600, Error::GameNotOver);
        let player_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx.sender_token_account()?.to_account_info().data.borrow()).as_ref()
        )?;
        
        require!(
            ctx.sender_token_account()?.key() == ctx.accounts.player.reward_account.expect("Player payout account not set"),
            Error::InvalidPayoutAccount
        );
        require!(
            ctx.accounts.prizepool.vault_token_account.expect("Vault token account not set") == ctx.vault_token_account()?.key(),
            Error::InvalidGameVault
        );
        let vault_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx.vault_token_account()?.to_account_info().data.borrow()).as_ref()
        )?;
        let exit_pid: Pubkey = pubkey!("A4qZibJ3rUGd9izgHXX5tapbRbhbT7Xu8u29RzKsuTp8"); 
        let map_pubkey = ctx.accounts.prizepool.map;
        let token_account_owner_pda_seeds = &[b"token_account_owner_pda", map_pubkey.as_ref()];
        let (derived_token_account_owner_pda, bump) = Pubkey::find_program_address(token_account_owner_pda_seeds, &exit_pid);
        require!(
            derived_token_account_owner_pda == ctx.token_account_owner_pda()?.key(),
            Error::InvalidPda
        );
        require!(
            derived_token_account_owner_pda == vault_token_account.owner,
            Error::InvalidGameVaultOwner
        );
        require!(
            vault_token_account.mint == ctx.accounts.prizepool.token.expect("Vault mint not set"),
            Error::InvalidMint
        );
        let tax_account: Pubkey = pubkey!("56T222W2y6VMP2e6M4twvvzQGi7eLN76bck3kaJCHG9F");
        let player = &mut ctx.accounts.player;
        let token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx.token_account()?.to_account_info().data.borrow()).as_ref()
        )?;
        player.mine_amount = 0;
        player.authority = None;
        player.reward_account = None;

    }

    #[system_input]
    pub struct Components {
        pub player: Player,
        pub prizepool:Prizepool,
        pub map: Map,
    }
    #[extra_accounts]
    pub struct ExtraAccounts {
        #[account(mut)]
        vault_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        sender_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        game_owner_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        token_account_owner_pda: AccountInfo<'info>,
        #[account(mut)]
        signer: Signer<'info>,
        system_program: Program<'info, System>,
        token_program: Program<'info, Token>,
        rent: Sysvar<'info, Rent>,
    }
}