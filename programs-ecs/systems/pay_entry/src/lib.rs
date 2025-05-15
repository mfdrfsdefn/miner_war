use anchor_spl::token::{TokenAccount, Transfer};
use bolt_lang::*;
use map::Map;
use player::Player;
use prizepool::Prizepool;
use solana_program::{
    account_info::AccountInfo,
    program::invoke_signed,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
declare_id!("GQCGW6hJZD7Ar8JPZqnGMKrbe98inGLDfcj3roGUimBd");
#[error_code]
pub enum Error {
    #[msg("Player already in game.")]
    AlreadyInGame,
    #[msg("Invalid game vault.")]
    InvalidGameVault,
    #[msg("Invalid game vault owner.")]
    InvalidGameVaultOwner,
    #[msg("Token mint mismatch.")]
    InvalidMint,
    #[msg("Token decimals not set.")]
    MissingTokenDecimals,
    #[msg("Player component doesn't belong to map.")]
    MapKeyMismatch,
    #[msg("Given buddy link member account not valid.")]
    InvalidMember,
    #[msg("Given referrer-subsidize account not valid.")]
    InvalidReferrer,
    #[msg("Invalid referral vault owner.")]
    InvalidReferralVaultOwner,
}

#[system]
pub mod pay_entry {

    pub fn execute(ctx: Context<Components>, _args: Vec<u8>) -> Result<Components> {
        let buy_in: f64 = ctx.accounts.map.buy_in;
        require!(
            ctx.accounts.prizepool.map == ctx.accounts.player.map,
            Error::MapKeyMismatch
        );
        require!(ctx.accounts.player.mine_amount == 0, Error::AlreadyInGame);
        require!(
            ctx.accounts.player.authority.is_none(),
            Error::AlreadyInGame
        );
        require!(
            ctx.accounts
                .prizepool
                .vault_token_account
                .expect("Vault token account not set")
                == ctx.vault_token_account()?.key(),
            Error::InvalidGameVault
        );

        let vault_token_account: TokenAccount = TokenAccount::try_deserialize_unchecked(
            &mut (ctx.vault_token_account()?.to_account_info().data.borrow()).as_ref(),
        )?;
        let exit_pid: Pubkey = pubkey!("A4qZibJ3rUGd9izgHXX5tapbRbhbT7Xu8u29RzKsuTp8"); //cash-out program id
        let map_pubkey = ctx
            .accounts
            .prizepool
            .map
            .expect("Prizepool map key not set");
        let token_account_owner_pda_seeds = &[b"token_account_owner_pda", map_pubkey.as_ref()];
        let (derived_token_account_owner_pda, _bump) =
            Pubkey::find_program_address(token_account_owner_pda_seeds, &exit_pid);
        require!(
            derived_token_account_owner_pda == vault_token_account.owner,
            Error::InvalidGameVaultOwner
        );
        require!(
            vault_token_account.mint
                == ctx
                    .accounts
                    .prizepool
                    .vault_token_account
                    .expect("Vault mint not set"),
            Error::InvalidMint
        );

        let decimals = ctx
            .accounts
            .prizepool
            .token_decimals
            .ok_or(Error::MissingTokenDecimals)?;
        let wallet_balance = vault_token_account.amount / 10_u64.pow(decimals);
        let player_reward_account = Some(ctx.payout_token_account()?.key());

        let transfer_instruction = Transfer {
            from: ctx.payout_token_account()?.to_account_info(),
            to: ctx.vault_token_account()?.to_account_info(),
            authority: ctx.signer()?.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.token_program()?.to_account_info(), transfer_instruction);
        let scale_factor = 10_u64.pow(decimals);
        let transfer_amount = (buy_in * scale_factor as f64).round() as u64;
        anchor_spl::token::transfer(cpi_ctx, transfer_amount)?;

        let player_authority = Some(ctx.player_account()?.key());
        let player = &mut ctx.accounts.player;
        let map = &mut ctx.accounts.map;
        for slot in &mut map.players.iter_mut() {
            if slot.is_none() {
                *slot = Some(player.key());
                break;
            }
        }
        player.authority = player_authority;
        player.reward_account = player_reward_account;
        player.buy_in = buy_in;
        player.map = Some(map.key());
        player.mining_speed = 1;
        player.mine_amount = 0;
        player.weapon_amount = 0;
        player.can_attack = true;
        Ok(ctx.accounts)
    }
    #[system_input]
    pub struct Components {
        pub map: Map,
        pub prizepool: Prizepool,
        pub player: Player,
    }

    #[extra_accounts]
    pub struct ExtraAccounts {
        #[account(mut)]
        vault_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        player_account: Account<'info, TokenAccount>,
        #[account(mut)]
        payout_token_account: Account<'info, TokenAccount>,
        #[account(mut)]
        signer: Signer<'info>,
        system_program: Program<'info, System>,
        token_program: Program<'info, Token>,
        rent: Sysvar<'info, Rent>,
    }
}
