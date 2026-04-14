import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const FinanceContext = createContext();

export function useFinance() {
  return useContext(FinanceContext);
}

export function FinanceProvider({ children }) {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWalletsRaw] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);

  // ─── Load all data ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!currentUser) {
      setTransactions([]);
      setWalletsRaw([]);
      setBudgets({});
      setSubscriptions([]);
      setGoals([]);
      return;
    }
    setLoading(true);
    try {
      const [txRes, wRes, bRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', currentUser.id).order('date', { ascending: false }),
        supabase.from('wallets').select('*').eq('user_id', currentUser.id),
        supabase.from('budgets').select('*').eq('user_id', currentUser.id),
      ]);

      if (txRes.data) {
        // Map snake_case to camelCase for compatibility with existing Dashboard code
        setTransactions(txRes.data.map(t => ({
          id: t.id,
          title: t.title,
          amount: t.amount,
          type: t.type,
          category: t.category,
          subCategory: t.sub_category,
          ticker: t.ticker,
          description: t.description,
          date: t.date,
          walletId: t.wallet_id,
        })));
      }

      if (wRes.data) {
        setWalletsRaw(wRes.data.map(w => ({
          id: w.id,
          name: w.name,
          type: w.type,
          balance: w.balance,
          limit: w.limit,
        })));
      }

      if (bRes.data) {
        const budgetMap = {};
        bRes.data.forEach(b => { budgetMap[b.category] = b.limit; });
        setBudgets(budgetMap);
      }

      // Load Subscriptions (soft fail if table not ready)
      try {
        const subRes = await supabase.from('subscriptions').select('*').eq('user_id', currentUser.id);
        if (subRes.data) {
          setSubscriptions(subRes.data.map(s => ({
            id: s.id, name: s.name, amount: s.amount, category: s.category, 
            billingDay: s.billing_day, isActive: s.is_active
          })));
        }
      } catch(e) { console.warn('Subscriptions table may not exist yet.'); }

      // Load Goals (soft fail)
      try {
        const goalsRes = await supabase.from('goals').select('*').eq('user_id', currentUser.id).order('deadline', { ascending: true });
        if (goalsRes.data) {
          setGoals(goalsRes.data.map(g => ({
            id: g.id, title: g.title, targetAmount: g.target_amount, 
            currentAmount: g.current_amount, deadline: g.deadline, color: g.color
          })));
        }
      } catch(e) { console.warn('Goals table may not exist yet.'); }

    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Transactions ───────────────────────────────────────────
  const addTransaction = async (transaction) => {
    if (!currentUser) return;
    const { data, error } = await supabase.from('transactions').insert([{
      user_id: currentUser.id,
      wallet_id: transaction.walletId || null,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      sub_category: transaction.subCategory || null,
      ticker: transaction.ticker || null,
      description: transaction.description || '',
      date: transaction.date,
    }]).select().single();

    if (!error && data) {
      setTransactions(prev => [{
        id: data.id,
        title: data.title,
        amount: data.amount,
        type: data.type,
        category: data.category,
        subCategory: data.sub_category,
        ticker: data.ticker,
        description: data.description,
        date: data.date,
        walletId: data.wallet_id,
      }, ...prev]);
    }
  };

  const deleteTransaction = async (id) => {
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const deleteTransactions = async (ids) => {
    if (!ids || ids.length === 0) return { success: true };
    try {
      const { error } = await supabase.from('transactions').delete().in('id', ids);
      if (error) {
        console.error('Supabase delete error:', error);
        return { success: false, message: error.message };
      }
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      return { success: true };
    } catch (err) {
      console.error('Unexpected delete error:', err);
      return { success: false, message: err.message };
    }
  };

  const bulkUpdateCategory = async (ids, newCategory) => {
    if (!ids || ids.length === 0) return { success: true };
    try {
      const { error } = await supabase.from('transactions').update({
        category: newCategory,
        sub_category: null
      }).in('id', ids);

      if (error) {
        console.error('Supabase bulk update error:', error);
        return { success: false, message: error.message };
      }

      setTransactions(prev => prev.map(t => ids.includes(t.id) ? { ...t, category: newCategory, subCategory: null } : t));
      return { success: true };
    } catch (err) {
      console.error('Unexpected bulk update error:', err);
      return { success: false, message: err.message };
    }
  };

  const updateTransaction = async (id, updatedData) => {
    const { error } = await supabase.from('transactions').update({
      title: updatedData.title,
      amount: updatedData.amount,
      type: updatedData.type,
      category: updatedData.category,
      sub_category: updatedData.subCategory || null,
      ticker: updatedData.ticker || null,
      description: updatedData.description || '',
      date: updatedData.date,
      wallet_id: updatedData.walletId || null,
    }).eq('id', id);

    if (!error) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));
    }
  };

  // ─── Wallets ────────────────────────────────────────────────
  const addWallet = async (wallet) => {
    if (!currentUser) return;
    const { data, error } = await supabase.from('wallets').insert([{
      user_id: currentUser.id,
      name: wallet.name,
      type: wallet.type,
      balance: wallet.balance || 0,
      limit: wallet.limit || null,
    }]).select().single();

    if (!error && data) {
      setWalletsRaw(prev => [...prev, { id: data.id, name: data.name, type: data.type, balance: data.balance, limit: data.limit }]);
    }
  };

  const deleteWallet = async (id) => {
    try {
      const { error } = await supabase.from('wallets').delete().eq('id', id);
      if (error) return { success: false, message: error.message };
      setWalletsRaw(prev => prev.filter(w => w.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updateWallet = async (id, updatedData) => {
    await supabase.from('wallets').update({
      name: updatedData.name,
      type: updatedData.type,
      balance: updatedData.balance || 0,
      limit: updatedData.limit || null,
    }).eq('id', id);
    setWalletsRaw(prev => prev.map(w => w.id === id ? { ...w, ...updatedData } : w));
  };

  // ─── Budgets ────────────────────────────────────────────────
  const updateBudget = async (category, limit) => {
    if (!currentUser) return;
    await supabase.from('budgets').upsert({
      user_id: currentUser.id,
      category,
      limit,
    }, { onConflict: 'user_id,category' });
    setBudgets(prev => ({ ...prev, [category]: limit }));
  };

  // ─── Subscriptions ──────────────────────────────────────────
  const addSubscription = async (sub) => {
    if (!currentUser) return { success: false };
    const { data, error } = await supabase.from('subscriptions').insert([{
      user_id: currentUser.id,
      name: sub.name,
      amount: sub.amount,
      category: sub.category,
      billing_day: sub.billingDay,
      is_active: sub.isActive !== undefined ? sub.isActive : true
    }]).select().single();

    if (!error && data) {
      setSubscriptions(prev => [...prev, {
        id: data.id, name: data.name, amount: data.amount, category: data.category, 
        billingDay: data.billing_day, isActive: data.is_active
      }]);
      return { success: true, data };
    }
    return { success: false, message: error?.message };
  };

  const toggleSubscription = async (id, isActive) => {
    const { error } = await supabase.from('subscriptions').update({ is_active: isActive }).eq('id', id);
    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, isActive } : s));
    }
  };

  const updateSubscription = async (id, updates) => {
    if (!currentUser) return { success: false };
    const { data, error } = await supabase.from('subscriptions').update({
      name: updates.name,
      amount: updates.amount,
      category: updates.category,
      billing_day: updates.billingDay,
    }).eq('id', id).select().single();
    if (!error && data) {
      setSubscriptions(prev => prev.map(s => s.id === id ? {
        ...s,
        name: data.name,
        amount: data.amount,
        category: data.category,
        billingDay: data.billing_day,
      } : s));
      return { success: true };
    }
    return { success: false, message: error?.message };
  };

  const deleteSubscription = async (id) => {
    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    if (!error) {
      setSubscriptions(prev => prev.filter(s => s.id !== id));
    }
  };

  // ─── Goals ──────────────────────────────────────────────────
  const addGoal = async (goal) => {
    if (!currentUser) return { success: false };
    const { data, error } = await supabase.from('goals').insert([{
      user_id: currentUser.id,
      title: goal.title,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount || 0,
      deadline: goal.deadline || null,
      color: goal.color || '#6366f1'
    }]).select().single();

    if (!error && data) {
      setGoals(prev => [...prev, {
        id: data.id, title: data.title, targetAmount: data.target_amount, 
        currentAmount: data.current_amount, deadline: data.deadline, color: data.color
      }]);
      return { success: true, data };
    }
    return { success: false, message: error?.message };
  };

  const updateGoalProgress = async (id, newAmount) => {
    const { error } = await supabase.from('goals').update({ current_amount: newAmount }).eq('id', id);
    if (!error) {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, currentAmount: newAmount } : g));
    }
  };

  const deleteGoal = async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (!error) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  // ─── Derived state ──────────────────────────────────────────
  const totals = transactions.reduce((acc, curr) => {
    const amount = parseFloat(curr.amount) || 0;
    if (curr.type === 'income') acc.income += amount;
    else acc.expense += amount;
    acc.balance = acc.income - acc.expense;
    return acc;
  }, { income: 0, expense: 0, balance: 0 });

  const dynamicWallets = wallets.map(w => {
    const related = transactions.filter(t => t.walletId === w.id);
    const sumIn = related.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const sumOut = related.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const currentBalance = w.type === 'checking'
      ? parseFloat(w.balance || 0) + sumIn - sumOut
      : sumOut - sumIn;
    return { ...w, dynamicBalance: currentBalance };
  });

  const value = {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteTransactions,
    bulkUpdateCategory,
    totals,
    wallets: dynamicWallets,
    addWallet,
    updateWallet,
    deleteWallet,
    budgets,
    updateBudget,
    subscriptions,
    addSubscription,
    toggleSubscription,
    updateSubscription,
    deleteSubscription,
    goals,
    addGoal,
    updateGoalProgress,
    deleteGoal,
    loading,
    refreshData: loadData,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}
