use bolt_lang::*;

declare_id!("HrY7PavGixzsDPGic6tehAcsa2G7DYew3Q4YsK8BkDFw");

#[component(delegate)]
pub struct Prizepool {
    #[max_len(20)]
    pub mine_remain: u64,
    pub total_machine_amount: u64,
    pub real_mining_speed: u64,
    pub vault_token_account: Option<Pubkey>,
    pub map: Option<Pubkey>,
    pub token_decimals: Option<u32>,
    pub buy_in:f64,
    pub token: Option<Pubkey>,
    pub gamecreater_token_account: Option<Pubkey>,
}

impl Default for Prizepool {
    fn default() -> Self {
        Self::new(PrizepoolInit {
            mine_remain: 0,
            total_machine_amount: 0,
            real_mining_speed: 0,
            vault_token_account: None,
            map: None,
            token_decimals: None,
            buy_in:100.0,
            token: None,
            gamecreater_token_account: None,
        })
    }
}

