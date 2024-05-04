import {
    deductStoreBalance,
    fetchStoresByVendorName,
    fetchUserData,
    insertTransactions,
    updateRewardRecord,
    updateUserRecord,
    upsertPointsRecords,
    insertRewardRecords,
} from "@/lib/crud";

import type { Transaction } from "@/lib/basiq";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert } from "@/types/supabase";
import type { ResolvedPromise, Reward } from "@/types/helpers";


export async function createTransactionRecords(
    transactions: Transaction[],
    storeData: ResolvedPromise<ReturnType<typeof fetchStoresByVendorName>>,
    userID: string,
) {
    // create new transaction  records by merging transactions from Basiq api with store data and user ID
    if (transactions.length === 0) return [];
    
    function reducer(acc: Omit<Tables<'transactions'>, 'id'>[], obj: Transaction) {
        const store = storeData.find((store) => store.vendor_name === obj.description);

        if (!store) return acc;

        // calculate points
        const points = Math.abs(parseFloat(obj.amount)) * store.points_rate;

        return [
            ...acc,
            {
                amount: parseFloat(obj.amount),
                date: obj.postDate,
                points: points,
                store_id: store.id,
                user_id: userID
            }
        ]
    }

    return transactions.reduce(reducer, []);
}

export async function processNewTransactions(
    newTransactions: ResolvedPromise<ReturnType<typeof createTransactionRecords>>,
    userData: ResolvedPromise<ReturnType<typeof fetchUserData>>,
    storeData: ResolvedPromise<ReturnType<typeof fetchStoresByVendorName>>,
    supabase: SupabaseClient<Database>,
) {
    // calculate new points balance for each store
    let totalSpend = 0;
    const pointsMap = new Map<string, number>();
    for (const transaction of newTransactions) {
        const currentBalance = userData.points.find((obj) => transaction.store_id === obj.store_id)?.balance || 0;
        pointsMap.set(transaction.store_id, currentBalance + transaction.points! + (pointsMap.get(transaction.store_id) || 0));

        totalSpend += Math.abs(transaction.amount!);
    }

    // initialise promises array
    const promises = [];
    // initialise new points records
    const newPointsRecords: Omit<TablesInsert<'points'>, 'user_id'>[] = [];
    // initialise new rewards records
    const newRewardsRecords: Omit<TablesInsert<'rewards'>, 'user_id'>[] = [];
    // get ids of existing user rewards
    const existingRewards = userData.rewards.map((reward) => reward.reward_types!.id);

    Array.from(pointsMap).forEach(([store_id, balance]) => {
        newPointsRecords.push({ balance, store_id });

        const store = storeData.find((obj) => obj.id === store_id);

        if (store) {
            for (const reward_type of store.reward_types) {
                if (balance > reward_type.cost && !existingRewards.includes(reward_type.id)) {
                    newRewardsRecords.push({
                        reward_id: reward_type.id,
                        earned_at: new Date().toISOString(), // this should be the date of the transaction
                    })
                }
            }
        }
    });

    // update points balance at each store
    promises.push(upsertPointsRecords(
        newPointsRecords,
        userData.id,
        supabase
    ));

    // credit rewards for each store
    promises.push(insertRewardRecords(
        newRewardsRecords,
        userData.id,
        supabase
    ))

    // insert records for new transactions
    promises.push(insertTransactions(newTransactions, supabase));

    // update user points balance and last_updated columns
    const POINTS_CONVERSION_RATE = 10;
    promises.push(updateUserRecord(
        {
            points_balance: userData.points_balance + totalSpend * POINTS_CONVERSION_RATE,
            last_updated: new Date().toISOString(),
        },
        userData.id,
        supabase
    ));

    return await Promise.all(promises)
    .then(() => true)
    .catch((e) => {
        console.log('error refreshing user data:', e);
        return false;
    });
}

export async function refreshUserData(userID: string, supabase: SupabaseClient<Database>) {
    const userData = await fetchUserData(userID, supabase);

    if (userData.newTransactions.length === 0) return false;

    const storeData = await fetchStoresByVendorName(
        userData.newTransactions.map((transaction) => transaction.description.toUpperCase()),
        supabase
    );

    const newTransactions = await createTransactionRecords(userData.newTransactions, storeData, userData.id);
    
    return await processNewTransactions(newTransactions, userData, storeData, supabase);
}

export async function redeemReward(
    reward: Reward,
    userID: string,
    supabase: SupabaseClient<Database>
) {
    // Step 1: set redeemed column to true
    await updateRewardRecord(
        {
            id: reward.id,
            redeemed: true,
            redeemed_at: new Date().toISOString(),
        },
        supabase
    );

    // Step 2: adjust user's points balance at store
    return await deductStoreBalance(
        reward.reward_types!.cost,
        reward.reward_types!.store_id,
        userID,
        supabase
    )
}