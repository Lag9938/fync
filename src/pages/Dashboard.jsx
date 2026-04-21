import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../contexts/FinanceContext';
import CustomDatePicker from '../components/CustomDatePicker';
import { logoBase64 } from '../utils/logoBase64';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  LogOut,
  Settings,
  PieChart,
  Bell,
  Search,
  Plus,
  Trash2,
  X,
  CreditCard,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  ShoppingBag,
  Home,
  Car,
  Utensils,
  HeartPulse,
  Coffee,
  Briefcase,
  Edit2,
  FileText,
  FileDown,
  TrendingUp,
  Activity,
  BarChart2,
  Globe2,
  ChevronDown,
  UploadCloud,
  Bitcoin,
  Calculator,
  LineChart,
  HelpCircle,
  Menu,
  Repeat,
  Target,
  CheckCircle2,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
  Sparkles,
  Gamepad2,
  Play,
  Pause,
  MoreVertical,
  CheckSquare,
  ArrowRightLeft,
  StickyNote
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseOFX } from '../utils/ofxParser';
import { predictCategory } from '../utils/smartCategory';
import AiAssistant from '../components/AiAssistant';
import { askGemini, batchCategorizeTransactions } from '../utils/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';

const APP_VERSION = '1.6.0.2';

const CATEGORIES = [
  { id: 'Alimentação', icon: Utensils },
  { id: 'Moradia', icon: Home },
  { id: 'Transporte', icon: Car },
  { id: 'Saúde', icon: HeartPulse },
  { id: 'Compras', icon: ShoppingBag },
  { id: 'Lazer', icon: Coffee },
  { id: 'Trabalho', icon: Briefcase },
  { id: 'Investimentos', icon: TrendingUp },
  { id: 'Outros', icon: ArrowUpRight },
];

const INVESTMENT_CATEGORIES = [
  { id: 'Ações B3', icon: BarChart2 },
  { id: 'FIIs/Imóveis', icon: Home },
  { id: 'Renda Fixa', icon: Shield },
  { id: 'Exterior/BDRs', icon: Globe2 },
  { id: 'Cripto', icon: Bitcoin },
];

// Pierre-style Store Icon Mapping with Brand Intelligence
const STORE_ICONS = {
  'nubank': { icon: CreditCard, color: '#8a05be', domain: 'nubank.com.br' },
  'amazon': { icon: ShoppingBag, color: '#ff9900', domain: 'amazon.com' },
  'riot': { icon: Gamepad2, color: '#d32936', domain: 'riotgames.com' },
  'netflix': { icon: Play, color: '#e50914', domain: 'netflix.com' },
  'spotify': { icon: Coffee, color: '#1db954', domain: 'spotify.com' },
  'steam': { icon: Home, color: '#171a21', domain: 'steampowered.com' },
  'uber': { icon: Car, color: '#000000', domain: 'uber.com' },
  'ifood': { icon: Utensils, color: '#ea1d2c', domain: 'ifood.com.br' },
  'mercado livre': { icon: ShoppingBag, color: '#fff159', domain: 'mercadolivre.com.br' },
  'google': { icon: Globe2, color: '#4285f4', domain: 'google.com' },
  'apple': { icon: CreditCard, color: '#000000', domain: 'apple.com' },
  'sony': { icon: Gamepad2, color: '#000000', domain: 'playstation.com' },
  'playstatn': { icon: Gamepad2, color: '#000000', domain: 'playstation.com' },
  'kabum': { icon: ShoppingBag, color: '#0060b1', domain: 'kabum.com.br' },
  'airbnb': { icon: Home, color: '#ff5a5f', domain: 'airbnb.com' },
  'disney': { icon: Play, color: '#113ccf', domain: 'disneyplus.com' },
  'youtube': { icon: Play, color: '#ff0000', domain: 'youtube.com' },
};

const getStoreIcon = (title) => {
  const t = title.toLowerCase();
  for (const [key, data] of Object.entries(STORE_ICONS)) {
    if (t.includes(key)) return { ...data, isBrand: true };
  }
  return { icon: ShoppingBag, color: 'var(--primary-color)', isBrand: false };
};

const parseInstallment = (title) => {
  const match = title.match(/(\d+)\s*[/]\s*(\d+)/) || title.match(/parcela\s*(\d+)\s*de\s*(\d+)/i);
  if (match) {
    const current = parseInt(match[1]);
    const total = parseInt(match[2]);

    // Ignore cases with only 1 installment (e.g. 1/1)
    if (total <= 1) return { isInstallment: false };

    // Ignore bank transfers/Pix commonly flagged as installments but being just codes
    const ignoreKeywords = ['pix', 'transferência', 'ted', 'doc', 'pagamento efetuado'];
    if (ignoreKeywords.some(k => title.toLowerCase().includes(k))) {
      return { isInstallment: false };
    }

    return {
      current,
      total,
      isInstallment: true
    };
  }
  return { isInstallment: false };
};

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const {
    transactions, totals, addTransaction, updateTransaction, deleteTransaction, deleteTransactions, bulkUpdateCategory,
    wallets, addWallet, updateWallet, deleteWallet, budgets, updateBudget,
    subscriptions, addSubscription, toggleSubscription, updateSubscription, deleteSubscription,
    goals, addGoal, updateGoalProgress, deleteGoal
  } = useFinance();

  // Persistence Loading
  const savedTab = localStorage.getItem('fync_active_tab') || 'overview';
  const savedMonth = localStorage.getItem('fync_filter_month');
  const savedMode = localStorage.getItem('fync_filter_mode') || 'month';
  const savedStart = localStorage.getItem('fync_filter_start');
  const savedEnd = localStorage.getItem('fync_filter_end');

  const [activeTab, setActiveTab] = useState(savedTab);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Category navigation state (used by renderCategories click -> renderTransactions filter)
  const [filterCategory, setFilterCategory] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const [expandedWallet, setExpandedWallet] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Header Menu and Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState([]);

  // B3 Importer State
  const [isB3ImportOpen, setIsB3ImportOpen] = useState(false);
  const [b3Preview, setB3Preview] = useState(null); // { rows: [...] }
  const [b3Importing, setB3Importing] = useState(false);
  const [b3DragOver, setB3DragOver] = useState(false);

  // Stock Quotes State
  const [stockQuotes, setStockQuotes] = useState({}); // { "PETR4": 35.50 }
  const [isQuotesLoading, setIsQuotesLoading] = useState(false);

  // Fullscreen & Immersive Mode
  const [isTxFullscreen, setIsTxFullscreen] = useState(false);
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('');

  // Market & Investor Data
  const [marketNews, setMarketNews] = useState([
    { id: 1, title: 'Ibovespa mostra resiliência em meio a cenário externo', date: 'Hoje', source: 'Fync News' },
    { id: 2, title: 'Mercado projeta nova alta na Selic para próximo Copom', date: '2h atrás', source: 'Fync News' },
    { id: 3, title: 'Dólar opera em estabilidade aguardando dados de inflação', date: '3h atrás', source: 'Fync News' }
  ]);
  const [marketIndices, setMarketIndices] = useState({
    ibov: { label: 'IBOVESPA', value: '---', change: '0.00%' },
    ifix: { label: 'IFIX', value: '---', change: '0.00%' },
    dolar: { label: 'DÓLAR', value: '---', change: '0.00%' }
  });
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  const fetchMarketIndices = async () => {
    try {
      const tickers = ['^BVSP', '^IFIX', 'USDBRL=X'];
      const results = {};

      for (const ticker of tickers) {
        const response = await fetch(`/api/yahoo/v8/finance/chart/${ticker}?interval=1d&range=1d`);
        if (response.ok) {
          const data = await response.json();
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
          const prevClose = data?.chart?.result?.[0]?.meta?.chartPreviousClose;

          if (price) {
            const change = prevClose ? ((price - prevClose) / prevClose * 100) : 0;
            const changeStr = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';

            if (ticker === '^BVSP') results.ibov = { label: 'IBOVESPA', value: price.toLocaleString('pt-BR'), change: changeStr };
            if (ticker === '^IFIX') results.ifix = { label: 'IFIX', value: price.toLocaleString('pt-BR'), change: changeStr };
            if (ticker === 'USDBRL=X') results.dolar = { label: 'DÓLAR', value: price.toFixed(2).replace('.', ','), change: changeStr };
          }
        }
      }

      if (Object.keys(results).length > 0) {
        setMarketIndices(prev => ({ ...prev, ...results }));
      }
    } catch (err) {
      console.error('Erro ao buscar índices:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'investments') {
      fetchMarketIndices();
      const interval = setInterval(fetchMarketIndices, 60000 * 5); // 5 min
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // OFX Import state
  const [ofxPreview, setOfxPreview] = useState(null); // { items: [...], walletId: '' }
  const [isAiAutoCategorizeEnabled, setIsAiAutoCategorizeEnabled] = useState(true);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isGoalProgressModalOpen, setIsGoalProgressModalOpen] = useState(false);
  const [goalProgressTarget, setGoalProgressTarget] = useState(null);
  const [goalProgressAmount, setGoalProgressAmount] = useState('');
  const [goalProgressWalletId, setGoalProgressWalletId] = useState('');

  // Asset Adjustment Modal State
  const [isAssetAdjustmentModalOpen, setIsAssetAdjustmentModalOpen] = useState(false);
  const [assetAdjustTarget, setAssetAdjustTarget] = useState(null);
  const [assetAdjustQty, setAssetAdjustQty] = useState('');
  const [assetAdjustAvgPrice, setAssetAdjustAvgPrice] = useState('');


  // Subscriptions Form State
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState('');
  const [subFormCategory, setSubFormCategory] = useState('Lazer');
  const [subBillingDay, setSubBillingDay] = useState(1);

  // Edit Subscription State
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
  const [editSubTarget, setEditSubTarget] = useState(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubAmount, setEditSubAmount] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('Lazer');
  const [editSubBillingDay, setEditSubBillingDay] = useState(1);

  // Goals Form State
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalColor, setGoalColor] = useState('#6366f1');

  // Month & Period Filtering State
  const currentDate = new Date();
  const initialMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const [filterMode, setFilterMode] = useState(savedMode);
  const [filterMonth, setFilterMonth] = useState(savedMonth || initialMonth);
  const [filterStartDate, setFilterStartDate] = useState(savedStart || currentDate.toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState(savedEnd || currentDate.toISOString().split('T')[0]);

  // Filters for Pie Chart
  const savedExcluded = JSON.parse(localStorage.getItem('fync_excluded_categories') || '[]');
  const [excludedCategories, setExcludedCategories] = useState(savedExcluded);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('fync_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('fync_filter_month', filterMonth);
    localStorage.setItem('fync_filter_mode', filterMode);
    localStorage.setItem('fync_filter_start', filterStartDate);
    localStorage.setItem('fync_filter_end', filterEndDate);
  }, [filterMonth, filterMode, filterStartDate, filterEndDate]);

  useEffect(() => {
    localStorage.setItem('fync_excluded_categories', JSON.stringify(excludedCategories));
  }, [excludedCategories]);

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const monthPickerRef = useRef(null);

  // Settings & Theme State
  const savedTheme = localStorage.getItem('fync_theme_color') || '#6366f1';
  const [settingsName, setSettingsName] = useState(currentUser?.user_metadata?.name || '');
  const [accentColor, setAccentColor] = useState(savedTheme);
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [isAiFloatingOpen, setIsAiFloatingOpen] = useState(false);
  const [expandedInstallmentId, setExpandedInstallmentId] = useState(null);
  const [activeInstallmentTab, setActiveInstallmentTab] = useState('active'); // 'active' | 'finalized'
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' | 'active' | 'inactive'

  // Transaction Filters State (Pierre Inspired)
  const [txSearch, setTxSearch] = useState('');
  const [txCategory, setTxCategory] = useState('Todas');
  const [txWallet, setTxWallet] = useState('Todas');
  const [txType, setTxType] = useState('Todas');
  const [txSort, setTxSort] = useState('recentes');
  const [txShowHidden, setTxShowHidden] = useState(false);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);

  // Apply Theme globally
  useEffect(() => {
    localStorage.setItem('fync_theme_color', accentColor);
    document.documentElement.style.setProperty('--primary-color', accentColor);
    document.documentElement.style.setProperty('--primary-hover', accentColor);
    document.documentElement.style.setProperty('--primary-light', `${accentColor}1a`);
  }, [accentColor]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  };
  const askConfirmation = (title, message, onConfirm, type = 'danger') => {
    setConfirmState({ isOpen: true, title, message, onConfirm, type });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target)) {
        setIsMonthPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Transaction State
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Alimentação');
  const [description, setDescription] = useState('');
  const [subCategory, setSubCategory] = useState('Ações B3');
  const [transactionDate, setTransactionDate] = useState(currentDate.toISOString().split('T')[0]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [ticker, setTicker] = useState('');
  const [keepModalOpen, setKeepModalOpen] = useState(false);

  // Smart Categorization: Auto-suggest category based on title typing
  useEffect(() => {
    if (isModalOpen && !editingTransactionId && title.length >= 3) {
      const suggested = predictCategory(title, transactions);
      if (suggested && suggested !== category) {
        setCategory(suggested);
      }
    }
  }, [title, isModalOpen, editingTransactionId, transactions]);

  // Wallet State
  const [editingWalletId, setEditingWalletId] = useState(null);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('checking');
  const [walletBalance, setWalletBalance] = useState('');

  // Budgets State
  const [editingBudgetFor, setEditingBudgetFor] = useState(null);
  const [budgetTempVal, setBudgetTempVal] = useState('');

  // Transfer System
  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || !transferAmount) {
      showToast('Preencha os campos da transferência', 'error');
      return;
    }
    if (transferFrom === transferTo) {
      showToast('A origem e o destino devem ser diferentes', 'error');
      return;
    }
    const amount = Math.abs(parseFloat(String(transferAmount).replace(',', '.')));
    if (isNaN(amount) || amount <= 0) return;

    await addTransaction({
      title: `Transferência enviada`,
      amount: amount,
      type: 'expense',
      category: 'Transferência',
      date: new Date().toISOString().split('T')[0],
      walletId: transferFrom,
    });
    await addTransaction({
      title: `Transferência recebida`,
      amount: amount,
      type: 'income',
      category: 'Transferência',
      date: new Date().toISOString().split('T')[0],
      walletId: transferTo,
    });

    setIsTransferModalOpen(false);
    setTransferFrom('');
    setTransferTo('');
    setTransferAmount('');
    showToast('Transferência realizada com sucesso!', 'success');
  };

  // File Refs
  const fileInputRef = useRef(null);
  const pdfImportRef = useRef(null);
  const excelImportRef = useRef(null);

  const { updateProfile, deleteAccount } = useAuth();

  const handleDeleteWallet = async (wallet) => {
    askConfirmation(
      'Excluir Carteira',
      `⚠️ Você tem certeza que deseja excluir a carteira "${wallet.name}"? Todos os lançamentos associados a ela perderão o vínculo de conta.`,
      async () => {
        const res = await deleteWallet(wallet.id);
        if (res.success) {
          showToast(`✅ Carteira "${wallet.name}" removida.`);
        } else {
          showToast(`❌ Erro: ${res.message}`, 'error');
        }
      }
    );
  };

  const handleUpdateProfile = async () => {
    // Basic validation
    if (settingsNewPassword) {
      if (settingsNewPassword.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
      }
      if (settingsNewPassword !== settingsConfirmPassword) {
        showToast('As senhas não coincidem!', 'error');
        return;
      }
    }

    setSavingSettings(true);
    const payload = { name: settingsName };
    if (settingsNewPassword) payload.password = settingsNewPassword;

    const res = await updateProfile(payload);
    setSavingSettings(false);
    if (res.success) {
      showToast('✅ Configurações salvas com sucesso!');
      setSettingsNewPassword('');
      setSettingsConfirmPassword('');
    } else {
      showToast(`❌ Erro ao salvar: ${res.message}`, 'error');
    }
  };

  const handleDeleteAccountAction = async () => {
    askConfirmation(
      'Excluir Conta Permanentemente',
      '⚠️ ATENÇÃO: Esta ação é irreversível. Todos os seus dados financeiros serão desconectados. Deseja excluir sua conta permanentemente?',
      async () => {
        const res = await deleteAccount();
        if (res.success) {
          window.location.reload();
        } else {
          showToast('❌ Erro ao excluir conta.', 'error');
        }
      }
    );
  };

  const openSubModal = () => {
    setSubName('');
    setSubAmount('');
    setSubFormCategory('Lazer');
    setSubBillingDay(1);
    setIsSubModalOpen(true);
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!subName || !subAmount || !subBillingDay) return;

    setLoading(true);
    const result = await addSubscription({
      name: subName,
      amount: parseFloat(subAmount),
      category: subFormCategory,
      billingDay: parseInt(subBillingDay, 10)
    });

    if (result.success) {
      showToast('Assinatura salva com sucesso!');
      setIsSubModalOpen(false);

      // Automated magic: Se a data de vencimento for hoje ou no passado neste mês, adicionar no extrato
      const today = new Date();
      const currentDay = today.getDate();
      if (parseInt(subBillingDay, 10) <= currentDay) {
        const txDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(subBillingDay).padStart(2, '0')}`;
        await addTransaction({
          title: subName,
          amount: parseFloat(subAmount),
          category: subFormCategory,
          type: 'expense',
          date: txDate,
          description: 'Lançamento gerado automaticamente via Assinatura.'
        });
      }
    } else {
      showToast(result.message || 'Erro ao salvar assinatura.', 'error');
    }
    setLoading(false);
  };

  const openGoalModal = () => {
    setGoalTitle('');
    setGoalTarget('');
    setGoalDeadline('');
    setGoalColor('#10b981');
    setIsGoalModalOpen(true);
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalTitle || !goalTarget) return;

    setLoading(true);
    const result = await addGoal({
      title: goalTitle,
      targetAmount: parseFloat(goalTarget),
      deadline: goalDeadline || null,
      color: goalColor
    });

    if (result.success) {
      showToast('Meta criada com sucesso!');
      setIsGoalModalOpen(false);
    } else {
      showToast(result.message || 'Erro ao criar meta.', 'error');
    }
    setLoading(false);
  };

  const handleAddGoalProgress = async (e) => {
    e.preventDefault();
    if (!goalProgressTarget || !goalProgressAmount) return;

    setLoading(true);
    const amountVal = parseFloat(goalProgressAmount);
    const newTotal = parseFloat(goalProgressTarget.currentAmount) + amountVal;

    // 1. Atualizar limite da meta
    const goalRes = await updateGoalProgress(goalProgressTarget.id, newTotal);

    if (goalRes.success) {
      // 2. Gerar a transação
      const txRes = await addTransaction({
        title: `Aporte em Meta: ${goalProgressTarget.title}`,
        amount: amountVal,
        type: 'expense',
        category: 'Investimentos',
        date: new Date().toISOString().split('T')[0],
        walletId: goalProgressWalletId || null,
        description: 'Aporte reservado da carteira para a meta de economia.'
      });

      if (txRes.success) {
        showToast('Progresso adicionado e transação gerada com sucesso!');
        setIsGoalProgressModalOpen(false);
      } else {
        showToast('Progresso salvo, mas erro ao gerar transação: ' + txRes.message, 'error');
      }
    } else {
      showToast('Erro ao atualizar meta.', 'error');
    }
    setLoading(false);
  };

  const handleAssetAdjustment = async (e) => {
    e.preventDefault();
    if (!assetAdjustTarget || assetAdjustQty === '' || assetAdjustAvgPrice === '') return;
    setLoading(true);
    const newQty = parseInt(assetAdjustQty, 10);
    const newAvgPrice = parseFloat(assetAdjustAvgPrice);
    const newTotalInvested = newQty * newAvgPrice;
    const diffInvested = newTotalInvested - assetAdjustTarget.totalInvested;
    const diffQty = newQty - assetAdjustTarget.quantity;

    if (diffInvested === 0 && diffQty === 0) {
      setIsAssetAdjustmentModalOpen(false);
      setLoading(false);
      return;
    }

    const txType = diffInvested >= 0 ? 'expense' : 'income';
    const txAmount = Math.abs(diffInvested) || 0.01;
    const qtyAbs = Math.abs(diffQty);
    const txTitle = `Ajuste Contábil ${assetAdjustTarget.ticker}${qtyAbs > 0 ? ` (${qtyAbs} cotas)` : ''}`;

    try {
      const res = await addTransaction({
        title: txTitle,
        amount: txAmount,
        type: txType,
        category: 'Investimentos',
        subCategory: 'Ações B3',
        ticker: assetAdjustTarget.ticker,
        date: new Date().toISOString().split('T')[0],
        walletId: wallets[0]?.id || null,
        description: 'Lançamento gerencial automático para corrigir Preço Médio e/ou Quantidade.'
      });
      if (res?.success === false) throw new Error(res.message);
      showToast(`✅ Posição de ${assetAdjustTarget.ticker} ajustada com sucesso!`);
      setIsAssetAdjustmentModalOpen(false);
    } catch (err) {
      showToast('Erro ao ajustar ativo: ' + (err.message || 'Erro desconhecido'), 'error');
    }
    setLoading(false);
  };

  // Investments Calculators State
  const [grahamVpa, setGrahamVpa] = useState('');
  const [grahamLpa, setGrahamLpa] = useState('');
  const fairPriceGraham = useMemo(() => {
    const vpa = parseFloat(grahamVpa);
    const lpa = parseFloat(grahamLpa);
    if (!vpa || !lpa || vpa <= 0 || lpa <= 0) return 0;
    return Math.sqrt(22.5 * vpa * lpa);
  }, [grahamVpa, grahamLpa]);

  const [bazinDividend, setBazinDividend] = useState('');
  const [bazinYield, setBazinYield] = useState('6');
  const fairPriceBazin = useMemo(() => {
    const div = parseFloat(bazinDividend);
    const yld = parseFloat(bazinYield);
    if (!div || !yld || yld <= 0) return 0;
    return div / (yld / 100);
  }, [bazinDividend, bazinYield]);

  // Fixed Income State
  const [fiInitial, setFiInitial] = useState('');
  const [fiMonthly, setFiMonthly] = useState('');
  const [fiRate, setFiRate] = useState('');
  const [fiMonths, setFiMonths] = useState('');

  const [fiRatePeriod, setFiRatePeriod] = useState('monthly');
  const [fiTimePeriod, setFiTimePeriod] = useState('months');

  // Custom dropdown open states for UI
  const [isRateDropdownOpen, setIsRateDropdownOpen] = useState(false);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  const rateRef = useRef(null);
  const timeRef = useRef(null);

  useEffect(() => {
    function handleClickOutsideCustom(event) {
      if (rateRef.current && !rateRef.current.contains(event.target)) setIsRateDropdownOpen(false);
      if (timeRef.current && !timeRef.current.contains(event.target)) setIsTimeDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutsideCustom);
    return () => document.removeEventListener("mousedown", handleClickOutsideCustom);
  }, []);

  const fiResult = useMemo(() => {
    let p = parseFloat(fiInitial) || 0;
    const pmt = parseFloat(fiMonthly) || 0;
    let r = (parseFloat(fiRate) || 0) / 100;
    let n = parseInt(fiMonths) || 0;

    // Normalize to monthly
    if (fiRatePeriod === 'yearly') {
      r = Math.pow(1 + r, 1 / 12) - 1;
    } else if (fiRatePeriod === 'semesterly') {
      r = Math.pow(1 + r, 1 / 6) - 1;
    }

    if (fiTimePeriod === 'years') {
      n = n * 12;
    } else if (fiTimePeriod === 'semesters') {
      n = n * 6;
    }

    if (r === 0) return p + (pmt * n);

    const amountP = p * Math.pow(1 + r, n);
    const amountPmt = pmt * ((Math.pow(1 + r, n) - 1) / r);
    return amountP + amountPmt;
  }, [fiInitial, fiMonthly, fiRate, fiMonths, fiRatePeriod, fiTimePeriod]);

  // Filtering Data
  const baseProjectedList = useMemo(() => {
    const baseTxs = (transactions || []).filter(t => {
      if (!t || !t.date) return false;
      const tIso = String(t.date);
      if (filterMode === 'month') {
        const targetMonth = filterMonth || initialMonth;
        return tIso.startsWith(targetMonth);
      } else {
        const tDate = new Date(tIso);
        const startObj = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : new Date('2000-01-01T00:00:00');
        const endObj = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : new Date('2100-01-01T23:59:59');
        return tDate >= startObj && tDate <= endObj;
      }
    });

    // Injetar Assinaturas como lançamentos virtuais (Projeção)
    if (subscriptions && subscriptions.length > 0) {
      let projectedSubs = [];

      if (filterMode === 'month') {
        const [year, month] = (filterMonth || initialMonth).split('-').map(Number);
        projectedSubs = subscriptions.filter(s => s.isActive).map(s => ({
          id: `sub-v-${s.id}`,
          title: s.name,
          amount: s.amount,
          type: 'expense',
          category: s.category || 'Outros',
          date: `${year}-${String(month).padStart(2, '0')}-${String(s.billingDay).padStart(2, '0')}`,
          isProjected: true,
          description: 'Assinatura recorrente (Projeção)'
        }));
      } else {
        const startD = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : new Date('2000-01-01T00:00:00');
        const endD = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : new Date('2100-01-01T23:59:59');

        subscriptions.filter(s => s.isActive).forEach(s => {
          let currentIter = new Date(startD.getFullYear(), startD.getMonth(), 1);
          const endIter = new Date(endD.getFullYear(), endD.getMonth(), 1);

          while (currentIter <= endIter) {
            const projDateStr = `${currentIter.getFullYear()}-${String(currentIter.getMonth() + 1).padStart(2, '0')}-${String(s.billingDay).padStart(2, '0')}`;
            const projDateObj = new Date(projDateStr + 'T12:00:00');
            if (projDateObj >= startD && projDateObj <= endD) {
              projectedSubs.push({
                id: `sub-v-${s.id}-${projDateStr}`,
                title: s.name,
                amount: s.amount,
                type: 'expense',
                category: s.category || 'Outros',
                date: projDateStr,
                isProjected: true,
                description: 'Assinatura recorrente (Projeção)'
              });
            }
            currentIter.setMonth(currentIter.getMonth() + 1);
          }
        });
      }

      // Evitar duplicidade exata
      const finalSubs = projectedSubs.filter(p => !baseTxs.some(t =>
        t.title === p.title &&
        parseFloat(t.amount) === parseFloat(p.amount) &&
        t.date === p.date
      ));

      return [...baseTxs, ...finalSubs];
    }

    return baseTxs;
  }, [transactions, filterMonth, filterMode, filterStartDate, filterEndDate, initialMonth, subscriptions]);

  // Smart filtering logic for Transactions (Pierre Inspired)
  const filteredTransactions = useMemo(() => {
    let list = [...baseProjectedList];

    // 1. Date Range Filter
    if (filterMode === 'month') {
      list = list.filter(t => t.date && String(t.date).startsWith(filterMonth));
    } else if (filterMode === 'period') {
      list = list.filter(t => {
        if (!t.date) return false;
        const d = t.date;
        return d >= filterStartDate && d <= filterEndDate;
      });
    }

    // 1b. Category navigation filter (from renderCategories click)
    if (filterCategory) {
      list = list.filter(t => t.category === filterCategory);
    }

    // 2. Type Filter
    if (txType !== 'Todas') {
      list = list.filter(t => txType === 'Receitas' ? t.type === 'income' : t.type === 'expense');
    }

    // 3. Category Filter
    if (txCategory !== 'Todas') {
      list = list.filter(t => t.category === txCategory);
    }

    // 4. Wallet Filter
    if (txWallet !== 'Todas') {
      list = list.filter(t => t.walletId === txWallet);
    }

    // 5. Search Filter (Global or Specific)
    const activeSearch = searchTerm || txSearch;
    if (activeSearch) {
      const s = activeSearch.toLowerCase();
      list = list.filter(t =>
        (t.title?.toLowerCase().includes(s)) ||
        (t.description?.toLowerCase().includes(s)) ||
        (t.category?.toLowerCase().includes(s))
      );
    }

    // 6. Sorting
    list.sort((a, b) => {
      if (txSort === 'recentes') return new Date(b.date) - new Date(a.date);
      if (txSort === 'antigas') return new Date(a.date) - new Date(b.date);
      if (txSort === 'valor-maior') return b.amount - a.amount;
      if (txSort === 'valor-menor') return a.amount - b.amount;
      return 0;
    });

    return list;
  }, [baseProjectedList, txType, txCategory, txWallet, txSearch, searchTerm, txSort, filterCategory]);

  // Totals for the current filtered view
  const txTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') acc.income += amt;
      else acc.expense += amt;
      acc.total += 1;
      return acc;
    }, { income: 0, expense: 0, total: 0 });
  }, [filteredTransactions]);

  const memoizedSortedTransactions = useMemo(() => {
    try {
      return [...filteredTransactions].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch (err) {
      console.error('Error sorting transactions:', err);
      return [];
    }
  }, [filteredTransactions]);

  const filteredTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => {
      const amt = parseFloat(curr.amount) || 0;
      if (curr.type === 'income') {
        acc.income += amt;
      } else {
        acc.expense += amt;
      }
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [filteredTransactions]);

  // Centralized Financial Context for AI (Now dynamic with selected period)
  const aiFinancialContext = useMemo(() => {
    const expByCategory = (filteredTransactions || []).filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + (parseFloat(t.amount) || 0);
      return acc;
    }, {});
    const topCategories = Object.entries(expByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    return {
      totalBalance: (wallets || []).reduce((s, w) => s + (w.balance || 0), 0),
      totalIncome: filteredTotals?.income || 0,
      totalExpenses: filteredTotals?.expense || 0,
      topCategories,
      activeGoals: (goals || []).filter(g => (g.currentAmount || 0) < g.targetAmount),
      activeSubscriptions: (subscriptions || []).filter(s => s.isActive || s.status === 'active'),
      wallets: wallets || [],
    };
  }, [filteredTransactions, wallets, filteredTotals, goals, subscriptions]);

  const dynamicCategoryData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, curr) => {
      const cat = curr.category || 'Outros';
      // Removendo Investimentos das Despesas Globais para não inflar gastos e alocar nos relatórios deles
      if (cat === 'Investimentos') return acc;
      acc[cat] = (acc[cat] || 0) + (parseFloat(curr.amount) || 0);
      return acc;
    }, {});

    return Object.keys(grouped).map(key => ({
      name: key,
      value: grouped[key]
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const investmentAportesData = useMemo(() => {
    const invAportes = filteredTransactions.filter(t => t.category === 'Investimentos' && t.type === 'expense');
    const grouped = invAportes.reduce((acc, curr) => {
      const cat = curr.subCategory || 'Outras Classes';
      acc[cat] = (acc[cat] || 0) + (parseFloat(curr.amount) || 0);
      return acc;
    }, {});
    return Object.keys(grouped).map(key => ({ name: key, value: grouped[key] })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const investmentDividendosData = useMemo(() => {
    const invIncome = filteredTransactions.filter(t => t.category === 'Investimentos' && t.type === 'income');
    const grouped = invIncome.reduce((acc, curr) => {
      const cat = curr.subCategory || 'Outras Classes';
      acc[cat] = (acc[cat] || 0) + (parseFloat(curr.amount) || 0);
      return acc;
    }, {});
    return Object.keys(grouped).map(key => ({ name: key, value: grouped[key] })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Portfolio Evolution Data (Last 12 months) for Investor Hub
  const investmentEvolutionData = useMemo(() => {
    const investmentTxs = transactions.filter(t => t.category === 'Investimentos');
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        month: d.toLocaleDateString('pt-BR', { month: 'short' }),
        timestamp: new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime(),
        invested: 0
      });
    }

    investmentTxs.forEach(t => {
      const txDate = new Date(t.date).getTime();
      months.forEach(m => {
        if (txDate <= m.timestamp && t.type === 'expense') {
          m.invested += t.amount;
        }
      });
    });

    return months;
  }, [transactions]);

  const dynamicFlowData = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return [];
    const grouped = {};
    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const dStr = String(t.date).split('T')[0];
      if (!grouped[dStr]) grouped[dStr] = { uv: 0, pv: 0 };
      if (t.type === 'income') grouped[dStr].uv += parseFloat(t.amount) || 0;
      else grouped[dStr].pv += parseFloat(t.amount) || 0;
    });
    return Object.keys(grouped).sort().map(dStr => {
      const parts = dStr.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      return {
        name: label,
        Receitas: grouped[dStr].uv,
        Despesas: grouped[dStr].pv,
      };
    });
  }, [filteredTransactions]);

  const healthScore = useMemo(() => {
    let score = 70; // Pontuação base
    const { income, expense } = filteredTotals;

    // 1. Razão Receita vs Despesa (Impacto Crítico)
    if (income > 0) {
      const savingsRate = (income - expense) / income;
      if (savingsRate > 0.3) score += 15;
      else if (savingsRate > 0.1) score += 5;
      else if (savingsRate < 0) score -= 30; // Rigoroso: Gastar mais do que ganha tira muita nota
    } else if (expense > 0) {
      score -= 40; // Sem receita mas com despesa
    }

    // 2. Conformidade de Orçamento
    Object.keys(budgets).forEach(cat => {
      const limit = budgets[cat];
      const used = dynamicCategoryData.find(d => d.name === cat)?.value || 0;
      if (limit > 0 && used > limit) {
        score -= 10; // Cada orçamento estourado penaliza
      }
    });

    // 3. Investimentos (Foco no futuro)
    const hasInvestments = filteredTransactions.some(t => t.category === 'Investimentos');
    if (hasInvestments) score += 10;

    // 4. Metas ativas
    if (goals.length > 0) {
      score += 5;
      const totalProgress = goals.reduce((acc, g) => acc + (g.currentAmount / g.targetAmount), 0) / goals.length;
      if (totalProgress > 0.5) score += 5;
    } else {
      score -= 10; // Falta de planejamento (metas) tira nota
    }

    return Math.max(0, Math.min(100, score));
  }, [filteredTotals, filteredTransactions, budgets, dynamicCategoryData, goals]);

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      alert("Nenhum dado financeiro para exportar neste período.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- CABEÇALHO EXECUTIVO ---
    doc.setFillColor(17, 24, 39); // Fundo escuro igual ao site
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(99, 102, 241); // Primary color

    try {
      doc.addImage(logoBase64, 'PNG', 14, 11, 14, 14);
      doc.text("Fync.", 30, 22.5);
    } catch (e) {
      doc.text("FYNC.", 14, 25);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(200, 200, 200);
    doc.text("Relatório Financeiro Executivo", pageWidth - 14, 25, { align: 'right' });

    // --- INFORMAÇÕES DO PERÍODO & SCORE ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(`Período: ${getDisplaySubtitle()}`, 14, 55);

    // Mini tabela/quadrados de resumo
    // Saldo
    doc.setFillColor(243, 244, 246);
    doc.rect(14, 65, 55, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Saldo", 18, 73);
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text(formatCurrency(filteredTotals.balance), 18, 83);

    // Receitas
    doc.setFillColor(236, 253, 245);
    doc.rect(74, 65, 55, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129); // text-success
    doc.text("Receitas (+)", 78, 73);
    doc.setFontSize(12);
    doc.text(formatCurrency(filteredTotals.income), 78, 83);

    // Despesas
    doc.setFillColor(254, 242, 242);
    doc.rect(134, 65, 55, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(239, 68, 68); // text-danger
    doc.text("Despesas (-)", 138, 73);
    doc.setFontSize(12);
    doc.text(formatCurrency(filteredTotals.expense), 138, 83);

    // Explicação do Fync Score
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text("Análise de Saúde Financeira (Fync Score)", 14, 110);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const scoreColor = healthScore > 70 ? [16, 185, 129] : healthScore > 40 ? [99, 102, 241] : [239, 68, 68];
    const scoreDesc = healthScore > 85 ? 'Gestão de Elite' : healthScore > 70 ? 'Muito Bom' : healthScore > 40 ? 'Pode melhorar' : 'Atenção Crítica';

    doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.text(`Score Atual: ${healthScore}/100 - ${scoreDesc}`, 14, 120);

    doc.setTextColor(100);
    const explicateLines = [
      "O Fync Score avalia os seguintes pontos baseados no seu período ativo:",
      "- Proporção de Economia (ganhar mais do que gasta) pontua positivamente.",
      "- Evitar o estouro de limites predefinidos de Orçamento.",
      "- Possuir Investimentos ativos garante pontuação por segurança financeira no longo prazo.",
      "- Estabelecer Metas de Vida (planejamento futuro) evita penalidades."
    ];
    doc.text(explicateLines, 14, 130);

    // --- TABELA DE TRANSAÇÕES ---
    const tableColumn = ["Data", "Título", "Categoria", "Tipo", "Valor"];
    const tableRows = [];

    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(t => {
      const transactionData = [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.title,
        t.category,
        t.type === 'income' ? 'Receita' : 'Despesa',
        formatCurrency(t.amount)
      ];
      tableRows.push(transactionData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 165,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [17, 24, 39], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 3) { // Coluna de Tipo
          if (data.cell.raw === 'Receita') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    });

    doc.save(`relatorio_${getDisplaySubtitle().replace(/ /g, '_')}_fync.pdf`);
    showToast("PDF gerado com sucesso!");
  };

  const handleExportExcel = () => {
    const userName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Usuário';
    const period = getDisplaySubtitle ? getDisplaySubtitle() : '';
    const totalIncome = filteredTotals.income || 0;
    const totalExpense = filteredTotals.expense || 0;
    const totalBalance = filteredTotals.balance || 0;

    // ---- Sheet 1: Resumo ----
    const summaryData = [
      ['FYNC - Relatório Financeiro'],
      [`Proprietário: ${userName}`],
      [`Período: ${period}`],
      [`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['RESUMO DO PERÍODO'],
      ['Receitas Totais', formatCurrency(totalIncome)],
      ['Despesas Totais', formatCurrency(totalExpense)],
      ['Saldo Final', formatCurrency(totalBalance)],
      ['Fync Score', `${healthScore}/100`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // ---- Sheet 2: Transações ----
    const headers = ['Data', 'Título', 'Categoria', 'Tipo', 'Carteira', 'Descrição', 'Valor (R$)'];
    const rowData = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.title,
      t.category,
      t.type === 'income' ? 'Receita' : 'Despesa',
      wallets.find(w => w.id === t.walletId)?.name || 'Sem Carteira',
      t.description || '',
      t.type === 'income' ? t.amount : -t.amount
    ]);
    // Totals row
    rowData.push([]);
    rowData.push(['', '', '', '', '', 'Receitas:', totalIncome]);
    rowData.push(['', '', '', '', '', 'Despesas:', -totalExpense]);
    rowData.push(['', '', '', '', '', 'Saldo:', totalBalance]);

    const wsTransactions = XLSX.utils.aoa_to_sheet([headers, ...rowData]);

    // Column widths
    wsTransactions['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 30 }, { wch: 14 }];
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumo');
    XLSX.utils.book_append_sheet(workbook, wsTransactions, 'Transações');
    XLSX.writeFile(workbook, `fync_extrato_${period.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Excel exportado com sucesso!');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const openNewTransaction = (overrideType = 'expense', overrideCategory = 'Alimentação', overrideSub = 'Ações B3') => {
    setEditingTransactionId(null);
    setTitle('');
    setDescription('');
    setAmount('');
    setType(overrideType);
    setCategory(overrideCategory);
    setSubCategory(overrideSub);
    setTicker('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setSelectedWalletId(wallets.length > 0 ? wallets[0].id : '');
    setKeepModalOpen(false);
    setIsModalOpen(true);
  };

  const openEditTransaction = (t) => {
    setEditingTransactionId(t.id);
    setTitle(t.title);
    setDescription(t.description || '');
    setAmount(String(t.amount));
    setType(t.type);
    setCategory(t.category);
    setSubCategory(t.subCategory || 'Ações B3');
    setTicker(t.ticker || '');
    setTransactionDate(t.date.split('T')[0]);
    setSelectedWalletId(t.walletId || (wallets.length > 0 ? wallets[0].id : ''));
    setIsModalOpen(true);
  };

  const handleAddTransaction = (e) => {
    if (e) e.preventDefault();
    if (!title || !amount || !transactionDate || !selectedWalletId) {
      alert("Preencha todos os campos e selecione uma carteira!");
      return;
    }

    const data = {
      title,
      description,
      amount: parseFloat(amount),
      type,
      category: category || 'Outros',
      subCategory: category === 'Investimentos' ? subCategory : undefined,
      date: new Date(transactionDate + 'T12:00:00').toISOString(),
      walletId: selectedWalletId,
      ticker: category === 'Investimentos' ? ticker : undefined
    };

    if (editingTransactionId) {
      updateTransaction(editingTransactionId, data);
      setIsModalOpen(false);
    } else {
      addTransaction(data);
      if (keepModalOpen) {
        setTitle('');
        setDescription('');
        setAmount('');
        if (category === 'Investimentos') setTicker('');
      } else {
        setIsModalOpen(false);
      }
    }
  };

  const openNewWallet = () => {
    setEditingWalletId(null);
    setWalletName('');
    setWalletType('checking');
    setWalletBalance('');
    setIsWalletModalOpen(true);
  };

  const openEditWallet = (w) => {
    setEditingWalletId(w.id);
    setWalletName(w.name);
    setWalletType(w.type);
    setWalletBalance(String(w.type === 'credit' ? w.limit : w.balance));
    setIsWalletModalOpen(true);
  };

  const handleAddWallet = (e) => {
    e.preventDefault();
    if (!walletName) return;

    const data = {
      name: walletName,
      type: walletType,
      balance: parseFloat(walletBalance) || 0,
      limit: walletType === 'credit' ? (parseFloat(walletBalance) || 1000) : null
    };

    if (editingWalletId) {
      updateWallet(editingWalletId, data);
    } else {
      addWallet(data);
    }
    setIsWalletModalOpen(false);
  };

  const saveBudget = (catId) => {
    updateBudget(catId, parseFloat(budgetTempVal) || 0);
    setEditingBudgetFor(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const tryParse = (content) => {
      console.log('[OFX] File read, length:', content.length);
      const extracted = parseOFX(content);
      if (extracted.length === 0) {
        alert('Nenhuma transação encontrada.\n\nVerifique se o arquivo é um extrato .OFX válido do seu banco.');
        return;
      }

      // 1. Pré-categorização local (IMEDIATA) - baseada no histórico
      const initialItems = extracted.map(item => ({
        ...item,
        category: predictCategory(item.title, transactions) || 'Outros',
        isAiSuggested: false
      }));

      // Abre o modal IMEDIATAMENTE
      setOfxPreview({
        items: initialItems,
        walletId: wallets.length > 0 ? wallets[0].id : ''
      });

      // 2. Dispara a IA em background (NÃO-BLOQUEANTE) - Somente se ativado
      if (isAiAutoCategorizeEnabled) {
        handleAiCategorization(initialItems);
      }
    };

    const handleAiCategorization = async (currentItems) => {
      // Filtra apenas o que é "Outros" e limita para não sobrecarregar
      const itemsToCategorize = currentItems
        .map((it, idx) => ({ idx, title: it.title, desc: it.description, category: it.category }))
        .filter(it => it.category === 'Outros' && it.idx < 100);

      if (itemsToCategorize.length === 0) return;

      setIsAiCategorizing(true);
      try {
        const catNames = CATEGORIES.map(c => c.id);
        const aiSuggestions = await batchCategorizeTransactions(
          itemsToCategorize.map(it => `${it.title} ${it.desc}`.trim()),
          catNames
        );

        // Atualiza conforme as sugestões chegam
        setOfxPreview(prev => {
          if (!prev) return null;
          const updatedItems = [...prev.items];
          itemsToCategorize.forEach((target, i) => {
            if (aiSuggestions[i] && updatedItems[target.idx].category === 'Outros') {
              updatedItems[target.idx] = {
                ...updatedItems[target.idx],
                category: aiSuggestions[i],
                isAiSuggested: true
              };
            }
          });
          return { ...prev, items: updatedItems };
        });
      } catch (err) {
        console.error('Falha na IA em background:', err);
      } finally {
        setIsAiCategorizing(false);
      }
    };

    // Tenta UTF-8 primeiro, depois Latin-1 (Itaú, Bradesco, BB usam ISO-8859-1)
    const readerUtf8 = new FileReader();
    readerUtf8.onload = (ev) => {
      const content = ev.target.result;
      if (content && content.includes('STMTTRN')) {
        tryParse(content);
      } else {
        // Fallback: tenta ISO-8859-1
        const readerLatin = new FileReader();
        readerLatin.onload = (ev2) => tryParse(ev2.target.result);
        readerLatin.readAsText(file, 'ISO-8859-1');
      }
    };
    readerUtf8.readAsText(file, 'UTF-8');

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // PDF Import - reads text from PDF and shows a manual review modal for confirmation
  const handlePDFImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (pdfImportRef.current) pdfImportRef.current.value = '';
    showToast('⚠️ Importação de PDF: lemos o texto do arquivo e tentamos extrair lançamentos. Para melhores resultados, use OFX (extrato bancário oficial).', 'info');
    // PDF text extraction requires pdf.js; for now show a helpful message
    showToast('📄 Importação de PDF disponível em breve. Por enquanto use o OFX do seu banco.', 'error');
  };

  // Excel/CSV Import - reads rows and maps them to transactions
  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (excelImportRef.current) excelImportRef.current.value = '';
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // Skip header row, map columns: Date, Title, Amount, Type
      const validRows = rows.slice(1).filter(row => row.length >= 3 && row[0] && row[2]);
      if (validRows.length === 0) {
        showToast('❌ Nenhum dado encontrado. Certifique-se que a planilha tem colunas: Data, Título, Valor.', 'error');
        return;
      }
      const items = validRows.map(row => {
        const rawDate = row[0];
        let dateStr;
        if (typeof rawDate === 'number') {
          // Excel serial date
          const d = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
          dateStr = d.toISOString().split('T')[0];
        } else {
          const parts = String(rawDate).split('/');
          if (parts.length === 3) dateStr = `${parts[2].length === 2 ? '20' + parts[2] : parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          else dateStr = new Date().toISOString().split('T')[0];
        }
        const amount = Math.abs(parseFloat(String(row[2]).replace(',', '.')) || 0);
        const type = parseFloat(String(row[2]).replace(',', '.')) >= 0 ? 'income' : 'expense';
        return {
          title: String(row[1] || 'Importado Excel').trim(),
          amount,
          type,
          date: dateStr,
          category: predictCategory(String(row[1] || ''), transactions) || 'Outros',
          description: row[3] ? String(row[3]) : 'Importado via Excel'
        };
      });
      setOfxPreview({ items, walletId: wallets.length > 0 ? wallets[0].id : '' });
      showToast(`✅ ${items.length} lançamentos lidos da planilha. Revise e confirme a importação.`);
    } catch (err) {
      console.error('Erro ao ler Excel:', err);
      showToast('❌ Erro ao ler o arquivo. Use .xlsx, .xls ou .csv com colunas: Data, Título, Valor.', 'error');
    }
  };

  const confirmOFXImport = async () => {
    if (!ofxPreview || ofxPreview.items.length === 0) return;

    setLoading(true);
    const items = ofxPreview.items;
    const wId = ofxPreview.walletId;

    try {
      // Importa transações evitando duplicatas (Título + Valor + Data Idênticos)
      let importedCount = 0;
      let skippedCount = 0;

      for (const tx of items) {
        const isDuplicate = transactions.some(existing => {
          const d1 = new Date(existing.date).toISOString().split('T')[0];
          const d2 = new Date(tx.date).toISOString().split('T')[0];
          return existing.title.trim().toLowerCase() === tx.title.trim().toLowerCase() &&
            Math.abs(parseFloat(existing.amount) - parseFloat(tx.amount)) < 0.01 &&
            d1 === d2;
        });

        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        await addTransaction({ ...tx, walletId: wId });
        importedCount++;
      }

      // Muda o filtro automaticamente para o mês da transação mais recente importada
      const firstDate = items[0].date;
      if (firstDate) {
        const targetMonth = firstDate.substring(0, 7); // YYYY-MM
        setFilterMonth(targetMonth);
        setFilterMode('month');
      }

      setOfxPreview(null);
      let toastMsg = `✅ ${importedCount} transações importadas com sucesso em ${new Date(items[0].date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.`;
      if (skippedCount > 0) {
        toastMsg += ` (${skippedCount} duplicatas ignoradas)`;
      }
      showToast(toastMsg);
    } catch (err) {
      console.error('Erro na importação:', err);
      showToast('❌ Ocorreu um erro ao importar as transações.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (visibleItems) => {
    if (selectedIds.length === visibleItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleItems.map(t => t.id));
    }
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedIds([]);
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const handleBulkUpdateCategory = async (newCategory) => {
    const count = selectedIds.length;
    askConfirmation(
      'Atualizar Categoria em Massa',
      `⚠️ Você deseja aplicar a categoria "${newCategory}" em ${count} lançamentos selecionados?`,
      async () => {
        const res = await bulkUpdateCategory(selectedIds, newCategory);
        if (res.success) {
          setSelectedIds([]);
          setIsSelectionMode(false);
          showToast(`✅ ${count} lançamentos categorizados como "${newCategory}".`);
        } else {
          showToast(`❌ Erro ao atualizar: ${res.message || 'Falha na conexão'}.`, 'error');
        }
      }
    );
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.length;
    askConfirmation(
      'Exclusão em Massa',
      `⚠️ Você tem certeza que deseja excluir ${count} lançamentos permanentemente?`,
      async () => {
        const res = await deleteTransactions(selectedIds);
        if (res.success) {
          setSelectedIds([]);
          setIsSelectionMode(false);
          showToast(`✅ ${count} lançamentos foram excluídos com sucesso.`);
        } else {
          showToast(`❌ Erro ao excluir: ${res.message || 'Falha na conexão'}.`, 'error');
        }
      }
    );
  };


  const handleAutoRefineCategories = async () => {
    const outros = transactions.filter(t => t.category === 'Outros');
    if (outros.length === 0) {
      showToast('✨ Todas as suas transações já possuem categorias específicas!', 'info');
      return;
    }

    // 1. Sugestões Locais (Rápido)
    const localUpdates = outros
      .map(t => ({
        id: t.id,
        newCategory: predictCategory(t.title, transactions.filter(h => h.id !== t.id))
      }))
      .filter(u => u.newCategory && u.newCategory !== 'Outros');

    const applyUpdates = async (updates) => {
      const updatesByCategory = {};
      updates.forEach(u => {
        if (!updatesByCategory[u.newCategory]) updatesByCategory[u.newCategory] = [];
        updatesByCategory[u.newCategory].push(u.id);
      });
      for (const [cat, ids] of Object.entries(updatesByCategory)) {
        await bulkUpdateCategory(ids, cat);
      }
    };

    const runDeepAi = async (items) => {
      setIsAiCategorizing(true);
      try {
        const catNames = CATEGORIES.map(c => c.id);
        const aiSuggestions = await batchCategorizeTransactions(
          items.map(t => t.title),
          catNames
        );

        const aiUpdates = items
          .map((t, i) => ({ id: t.id, newCategory: aiSuggestions[i] }))
          .filter(u => u.newCategory && u.newCategory !== 'Outros');

        if (aiUpdates.length > 0) {
          await applyUpdates(aiUpdates);
          showToast(`✅ IA Profunda categorizou ${aiUpdates.length} transações!`);
        } else {
          showToast('🔍 A IA não encontrou categorias melhores para estes registros.', 'info');
        }
      } catch (err) {
        console.error('Erro na IA Profunda:', err);
        showToast('❌ Falha na comunicação com a IA.', 'error');
      } finally {
        setIsAiCategorizing(false);
      }
    };

    if (localUpdates.length > 0) {
      askConfirmation(
        'Refinamento do Finn ✨',
        `Encontramos sugestões para ${localUpdates.length} transações baseadas em padrões conhecidos (Uber, Airbnb, etc). Aplicar agora?`,
        async () => {
          setIsAiCategorizing(true);
          try {
            await applyUpdates(localUpdates);
            showToast(`✅ ${localUpdates.length} transações atualizadas!`);

            const remaining = transactions.filter(t => t.category === 'Outros' && !localUpdates.some(lu => lu.id === t.id));
            if (remaining.length > 0) {
              setTimeout(() => {
                askConfirmation(
                  'Inteligência Profunda 🤖',
                  `Ainda restam ${remaining.length} transações como "Outros". Deseja que o Finn use Inteligência Artificial avançada para pesquisar essas empresas?`,
                  () => runDeepAi(remaining)
                );
              }, 1000);
            }
          } catch (err) {
            showToast('❌ Erro ao atualizar.', 'error');
          } finally {
            setIsAiCategorizing(false);
          }
        }
      );
    } else {
      askConfirmation(
        'Inteligência Profunda 🤖',
        `Não encontramos padrões óbvios. Deseja que o Finn use Inteligência Artificial avançada para analisar os ${outros.length} registros restantes?`,
        () => runDeepAi(outros)
      );
    }
  };

  const exportToExcel = () => {
    if (transactions.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }
    const userName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Usuário';
    const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // ---- Sheet 1: Resumo Geral ----
    const summaryData = [
      ['FYNC - Histórico Financeiro Completo'],
      [`Proprietário: ${userName}`],
      [`Exportado em: ${new Date().toLocaleDateString('pt-BR')}`],
      [],
      ['TOTALIZADOR GERAL'],
      ['Total de Receitas', formatCurrency(allIncome)],
      ['Total de Despesas', formatCurrency(allExpense)],
      ['Saldo Global', formatCurrency(allIncome - allExpense)],
      [],
      ['Fync Score', `${healthScore}/100`],
      ['Total de Lançamentos', transactions.length],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];

    // ---- Sheet 2: Histórico Completo ----
    const headers = ['#', 'Data', 'Título', 'Categoria', 'Subcategoria', 'Tipo', 'Carteira', 'Descrição', 'Valor (R$)'];
    const rowData = [...transactions]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .map((t, i) => [
        i + 1,
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.title,
        t.category,
        t.subCategory || '',
        t.type === 'income' ? 'Receita' : 'Despesa',
        wallets.find(w => w.id === t.walletId)?.name || 'Sem Carteira',
        t.description || '',
        t.type === 'income' ? t.amount : -t.amount
      ]);
    rowData.push([]);
    rowData.push(['', '', '', '', '', '', '', 'Total Receitas:', allIncome]);
    rowData.push(['', '', '', '', '', '', '', 'Total Despesas:', -allExpense]);
    rowData.push(['', '', '', '', '', '', '', 'SALDO:', allIncome - allExpense]);

    const wsHistory = XLSX.utils.aoa_to_sheet([headers, ...rowData]);
    wsHistory['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 38 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 30 }, { wch: 14 }];

    // ---- Sheet 3: Categorias ----
    const catMap = {};
    transactions.forEach(t => {
      if (!catMap[t.category]) catMap[t.category] = { receitas: 0, despesas: 0 };
      if (t.type === 'income') catMap[t.category].receitas += t.amount;
      else catMap[t.category].despesas += t.amount;
    });
    const catHeaders = ['Categoria', 'Total Receitas', 'Total Despesas', 'Saldo'];
    const catRows = Object.entries(catMap).map(([cat, vals]) => [
      cat,
      vals.receitas,
      vals.despesas,
      vals.receitas - vals.despesas
    ]);
    const wsCat = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
    wsCat['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');
    XLSX.utils.book_append_sheet(wb, wsHistory, 'Histórico');
    XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria');
    XLSX.writeFile(wb, `fync_relatorio_completo_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Excel exportado com sucesso!');
  };

  const exportToPDF = () => {
    if (transactions.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }
    const doc = new jsPDF();
    doc.text("Histórico Completo - Fync", 14, 15);
    const tableData = transactions.map(t => {
      const walletName = wallets.find(w => w.id === t.walletId)?.name || 'Sem Carteira';
      return [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.title,
        t.category,
        t.type === 'income' ? 'Receita' : 'Despesa',
        walletName,
        `R$ ${parseFloat(t.amount).toFixed(2)}`
      ]
    });
    doc.autoTable({
      startY: 20,
      head: [['Data', 'Título', 'Categoria', 'Tipo', 'Carteira', 'Valor']],
      body: tableData
    });
    doc.save("fync_historico.pdf");
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const shortMonthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const getDisplaySubtitle = () => {
    if (filterMode === 'month') {
      if (!filterMonth || !filterMonth.includes('-')) return "Desconhecido";
      const [y, m] = filterMonth.split('-');
      return `${monthNames[parseInt(m, 10) - 1]} de ${y}`;
    } else {
      if (!filterStartDate || !filterEndDate) return "Período Personalizado";
      const formatObj = (dateStr) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y.slice(2)}`;
      };
      return `${formatObj(filterStartDate)} até ${formatObj(filterEndDate)}`;
    }
  };

  const renderInteractiveSelector = () => (
    <div style={{ marginBottom: '2rem', position: 'relative', zIndex: 1000 }}>
      <div className="glass-panel" style={{ display: 'inline-flex', padding: '0.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', gap: '0.5rem' }}>
        <button
          className={`btn ${filterMode === 'month' ? 'btn-primary' : 'btn-icon'}`}
          style={{ padding: '0.5rem 1rem', boxShadow: filterMode === 'month' ? 'var(--shadow-glow)' : 'none' }}
          onClick={() => setFilterMode('month')}
        >
          <Calendar size={16} /> Por Mês
        </button>
        <button
          className={`btn ${filterMode === 'period' ? 'btn-primary' : 'btn-icon'}`}
          style={{ padding: '0.5rem 1rem', boxShadow: filterMode === 'period' ? 'var(--shadow-glow)' : 'none' }}
          onClick={() => setFilterMode('period')}
        >
          <CalendarDays size={16} /> Período Específico
        </button>
      </div>
      <br />
      {filterMode === 'month' ? (
        <div style={{ position: 'relative', display: 'inline-block' }} ref={monthPickerRef}>
          <button
            className="glass-panel btn font-bold"
            style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--primary-color)', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
          >
            <Calendar size={18} className="text-primary" />
            {getDisplaySubtitle()}
          </button>
          {isMonthPickerOpen && (
            <div className="glass-panel animate-fade-in" style={{
              position: 'absolute', top: '120%', left: 0, zIndex: 99999, padding: '1.5rem',
              borderRadius: 'var(--radius-xl)', minWidth: '320px', border: '1px solid rgba(99, 102, 241, 0.4)',
              boxShadow: 'var(--shadow-lg)', backgroundColor: '#171923'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button className="btn-icon" onClick={() => setPickerYear(pickerYear - 1)}><ChevronLeft size={20} /></button>
                <span className="font-bold text-lg">{pickerYear}</span>
                <button className="btn-icon" onClick={() => setPickerYear(pickerYear + 1)}><ChevronRight size={20} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {shortMonthNames.map((mName, index) => {
                  const mStr = String(index + 1).padStart(2, '0');
                  const checkVal = `${pickerYear}-${mStr}`;
                  const isSelected = filterMonth === checkVal;
                  return (
                    <button
                      key={mName}
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                      onClick={() => {
                        setFilterMonth(checkVal);
                        setIsMonthPickerOpen(false);
                      }}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '200px' }}>
            <span className="text-sm text-muted font-bold">De:</span>
            <CustomDatePicker value={filterStartDate} onChange={setFilterStartDate} />
          </div>
          <span className="text-muted">|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '200px' }}>
            <span className="text-sm text-muted font-bold">Até:</span>
            <CustomDatePicker value={filterEndDate} onChange={setFilterEndDate} />
          </div>
        </div>
      )}
    </div>
  );
  const renderMainTransactionTable = () => {
    return (
      <div
        className={`glass-panel ${isTxFullscreen ? 'immersive-tx-view' : ''}`}
        style={!isTxFullscreen ? { padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: 'none', background: 'transparent' } : {}}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isSelectionMode && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const allFilteredIds = filteredTransactions.map(t => t.id);
                    const areAllSelected = allFilteredIds.every(id => selectedIds.includes(id));
                    if (areAllSelected) {
                      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                    } else {
                      setSelectedIds(prev => [...new Set([...prev, ...allFilteredIds])]);
                    }
                  }}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white'
                  }}
                >
                  {filteredTransactions.every(t => selectedIds.includes(t.id)) ? 'Desmarcar Página' : 'Selecionar Tudo na Página'}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={toggleSelectionMode}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444'
                  }}
                >
                  Parar Seleção
                </button>
              </div>
            )}
            {selectedIds.length > 0 && (
              <span className="badge" style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                {selectedIds.length} selecionados
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', marginRight: '1rem' }}>
                <select
                  className="input-field"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
                  onChange={(e) => handleBulkCategoryUpdate(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>📁 Trocar Categoria...</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select>
                <button className="btn-icon text-danger" onClick={handleBulkDelete} title="Excluir Selecionados">
                  <Trash2 size={20} />
                </button>
              </div>
            )}

            {!isSelectionMode && transactions.some(t => t.category === 'Outros') && (
              <button
                className="btn btn-secondary"
                onClick={handleAutoRefineCategories}
                title="O Finn analisará transações 'Outros' para sugerir categorias melhores"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginRight: '0.5rem'
                }}
              >
                <Sparkles size={14} /> Refinar "Outros"
              </button>
            )}
            <button className="btn-icon" onClick={() => setIsTxFullscreen(!isTxFullscreen)} title="Alternar Tela Cheia">
              {isTxFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '1rem', width: '48px' }}>
                  {isSelectionMode ? (
                    <input
                      type="checkbox"
                      title="Selecionar todos"
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(filteredTransactions.map(t => t.id));
                        else setSelectedIds([]);
                      }}
                      checked={selectedIds.length > 0 && selectedIds.length === filteredTransactions.length}
                    />
                  ) : (
                    <button
                      onClick={toggleSelectionMode}
                      title="Ativar seleção múltipla"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        padding: '2px'
                      }}
                    >
                      <CheckSquare size={16} />
                    </button>
                  )}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>DESCRIÇÃO</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>CATEGORIA</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>CONTA</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>DATA</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>VALOR</th>
                <th style={{ padding: '1rem', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(t => {
                const { icon: StoreIcon, color: iconColor, domain, isBrand } = getStoreIcon(t.title);
                const wallet = wallets.find(w => w.id === t.walletId);

                return (
                  <tr
                    key={t.id}
                    className={`fync-tx-row-premium${selectedIds.includes(t.id) ? ' tx-row-selected' : ''}`}
                    style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
                    onClick={(e) => {
                      if (e.target.closest('button') || e.target.type === 'checkbox' || e.target.tagName === 'SELECT') return;
                      if (isSelectionMode) {
                        setSelectedIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]);
                      } else {
                        openEditTransaction(t);
                      }
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      {isSelectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => setSelectedIds(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                        />
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div className={`store-badge-circle mini ${isBrand ? 'brand-logo' : ''}`} style={{ backgroundColor: isBrand ? '#fff' : iconColor, width: '32px', height: '32px' }}>
                          {isBrand ? (
                            <img
                              src={`https://logo.clearbit.com/${domain}?size=64`}
                              alt={t.name}
                              className="brand-logo-img"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
                              }}
                            />
                          ) : (
                            <StoreIcon size={16} color="#fff" />
                          )}
                        </div>
                        <div className="tx-title-container">
                          <span style={{ fontWeight: 600 }}>{t.title}</span>
                          {t.description && (
                            <>
                              <StickyNote size={14} className="tx-memo-indicator" />
                              <div className="tx-memo-balloon">
                                <div className="tx-memo-header">
                                  <StickyNote size={12} /> Memorando
                                </div>
                                {t.description}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="premium-category-tag" title="Clique para alterar a categoria" style={{ position: 'relative', overflow: 'hidden', border: `1px solid ${iconColor}33`, backgroundColor: `${iconColor}1a`, color: iconColor }}>
                        {CATEGORIES.find(c => c.id === t.category) ? React.createElement(CATEGORIES.find(c => c.id === t.category).icon, { size: 14 }) : <ArrowUpRight size={14} />}
                        <span>{t.category}</span>
                        <select
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                          value={t.category}
                          onChange={(e) => updateTransaction(t.id, { category: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className="tx-account-badge">
                        <div className={`tx-account-icon ${getStoreIcon(wallet?.name || '').isBrand ? 'brand-transparent' : ''}`} style={{ color: getStoreIcon(wallet?.name || '').color }}>
                          {getStoreIcon(wallet?.name || '').isBrand ? (
                            <img
                              src={`https://logo.clearbit.com/${getStoreIcon(wallet?.name || '').domain}?size=64`}
                              alt={wallet?.name}
                              className="wallet-bank-logo"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://www.google.com/s2/favicons?sz=64&domain=${getStoreIcon(wallet?.name || '').domain}`;
                              }}
                            />
                          ) : (
                            wallet?.type === 'checking' ? <Wallet size={14} /> : <CreditCard size={14} />
                          )}
                        </div>
                        <span style={{ fontWeight: 500 }}>{wallet?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: t.type === 'income' ? 'var(--success-color)' : '#fff' }}>
                      {t.type === 'income' ? '+ ' : ''}{formatCurrency(t.amount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-icon circle-btn mini" onClick={() => openEditTransaction(t)}><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="text-center text-muted" style={{ padding: '5rem' }}>Nenhum lançamento encontrado para esses filtros.</div>
          )}
        </div>
      </div>
    );
  };

  const renderInteractiveOverview = () => {
    // Generate insights for the greeting card
    const userName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0];
    const { expense: currentMonthExpense } = filteredTotals;

    // Find top expense category of the current month
    const topCat = dynamicCategoryData[0]?.name || '...';

    // Rhythm logic (simplified mockup-like)
    const rhythmValue = currentMonthExpense;
    const previousMonthTotal = transactions
      .filter(t => t.type === 'expense' && !String(t.date).startsWith(filterMonth))
      .reduce((s, t) => s + t.amount, 0) / 12; // hypothetical avg or prev month

    const diff = rhythmValue - previousMonthTotal;
    const diffPct = previousMonthTotal > 0 ? (diff / previousMonthTotal) * 100 : 0;

    // Upcoming Bills (Subscriptions + soon-to-be installments)
    const upcomingBills = [
      ...subscriptions.filter(s => s.isActive).map(s => ({ ...s, source: 'Assinatura', type: 'sub' })),
      // Logic for next installments could be added here
    ].slice(0, 3);

    return (
      <div className="interactive-layout animate-fade-in hub-container">
        <div className="interactive-main-grid">
          {/* Greeting Hero */}
          <div className="greeting-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 className="greeting-title">Bora trocar uma ideia com sua grana?</h1>
                <p className="greeting-text">
                  {userName}, suas despesas com <span style={{ color: '#10b981', fontWeight: 'bold' }}>{topCat.toLowerCase()}</span> {currentMonthExpense > 2000 ? 'estão um pouco altas este mês' : 'estão sob controle'}!
                  Fica de olho pra não perder o equilíbrio.
                </p>
              </div>
              <div className="score-badge-large">
                <div className="score-val">{healthScore}</div>
                <div className="score-label">Fync Score</div>
              </div>
            </div>

            <div className="hero-stats-row">
              <div className="hero-mini-card">
                <div className="mini-card-label">Gasto em {new Date().toLocaleString('pt-BR', { month: 'long' })}</div>
                <div className="mini-card-value">{formatCurrency(currentMonthExpense)}</div>
              </div>
              <div className="hero-mini-card">
                <div className="mini-card-label">Vs. Mês Anterior</div>
                <div className="mini-card-value" style={{ color: diffPct > 0 ? '#ef4444' : '#10b981' }}>
                  {diffPct > 0 ? '+' : ''}{diffPct.toFixed(0)}%
                </div>
              </div>
              <div className="hero-mini-card">
                <div className="mini-card-label">Principais Metas</div>
                <div className="mini-card-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Target size={14} className="text-primary" /> {goals.length} ativas
                </div>
              </div>
            </div>
          </div>

          <div className="hub-sidebar-widgets">
            {/* Upcoming Card */}
            <div className="modern-list-card glass-panel upcoming-widget">
              <h3 className="widget-title">Próximos Vencimentos</h3>
              <div className="upcoming-list">
                {upcomingBills.length > 0 ? upcomingBills.map((bill, i) => (
                  <div key={i} className="upcoming-item">
                    <div className="bill-icon"><Clock size={14} /></div>
                    <div className="bill-info">
                      <div className="bill-name">{bill.name}</div>
                      <div className="bill-date">Dia {bill.billingDay}</div>
                    </div>
                    <div className="bill-amount">{formatCurrency(bill.amount)}</div>
                  </div>
                )) : <div className="text-muted text-sm">Tudo em dia!</div>}
              </div>
              <button className="btn-link-sm" onClick={() => setActiveTab('subscriptions')}>Ver tudo</button>
            </div>

            {/* Goals Card */}
            <div className="modern-list-card glass-panel goals-widget">
              <h3 className="widget-title">Suas Metas</h3>
              <div className="goals-mini-list">
                {goals.slice(0, 2).map((goal, i) => {
                  const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                  return (
                    <div key={i} className="goal-mini-item">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{goal.title}</span>
                        <span className="font-bold">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="mini-progress-bg">
                        <div className="mini-progress-fill" style={{ width: `${pct}%`, background: goal.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Central Hub Grid */}
        <div className="hub-central-grid">
          {/* Ritmo de Gastos Card */}
          <div className="ritmo-card glass-panel">
            <div className="ritmo-header">
              <div>
                <div className="ritmo-label">Ritmo de Gastos</div>
                <div className="ritmo-value">
                  {formatCurrency(rhythmValue)}
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: '8px' }}>consumidos</span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setActiveTab('transactions')} style={{ fontSize: '0.75rem', color: '#10b981' }}>
                Extrato <ArrowUpRight size={14} />
              </button>
            </div>

            <div style={{ width: '100%', height: 180, marginTop: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicFlowData}>
                  <defs>
                    <linearGradient id="ritmoColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#171923', border: 'none', borderRadius: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="Despesas"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#ritmoColor)"
                    dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budgets Widget */}
          <div className="modern-list-card glass-panel budget-hub-widget">
            <div className="flex justify-between items-center mb-4">
              <h3 className="widget-title">Orçamentos Limites</h3>
              <span className="text-xs text-muted">Mês Atual</span>
            </div>
            <div className="budget-mini-grid">
              {CATEGORIES.slice(0, 4).map(cat => {
                const limit = budgets[cat.id] || 1000;
                const used = dynamicCategoryData.find(d => d.name === cat.id)?.value || 0;
                const pct = (used / limit) * 100;
                return (
                  <div key={cat.id} className="budget-mini-item">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs">{cat.id}</span>
                      <span className="text-xs font-bold">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="mini-progress-bg">
                      <div className="mini-progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 100 ? '#ef4444' : '#10b981' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Wallets and Credit Card Section */}
        <div className="bottom-sections-grid">
          <div className="modern-list-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="modern-title" style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Contas Correntes</h3>
              <button className="btn-icon" onClick={() => setActiveTab('wallets')}><Maximize2 size={16} /></button>
            </div>

            <div className="account-list">
              {wallets.filter(w => w.type === 'checking').map(w => (
                <div key={w.id} className="account-item">
                  <div className="account-main">
                    <div className="account-icon-box" style={{ background: '#8a05be' }}>
                      <Wallet size={20} style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <div className="account-name">{w.name}</div>
                      <div className="account-type">Conta corrente</div>
                    </div>
                  </div>
                  <div className="account-balance">{formatCurrency(w.dynamicBalance)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="modern-list-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="modern-title" style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Cartões de Crédito</h3>
              <button className="btn-icon" onClick={() => setActiveTab('wallets')} style={{ fontSize: '0.75rem', color: '#10b981' }}>
                ver detalhes <ArrowUpRight size={14} />
              </button>
            </div>

            {wallets.filter(w => w.type === 'credit').slice(0, 1).map(w => {
              const limit = parseFloat(w.limit) || 0;
              const used = Math.abs(parseFloat(w.dynamicBalance) || 0);
              const available = limit - used;
              const pct = limit > 0 ? (available / limit) * 100 : 0;

              return (
                <div key={w.id}>
                  <div className="ritmo-value" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{formatCurrency(available)}</div>
                  <div className="text-muted text-sm">Disponível de {formatCurrency(limit)}</div>

                  <div className="credit-progress-box">
                    <div className="account-main" style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                      <div className="account-icon-box" style={{ background: '#8a05be' }}>
                        <CreditCard size={18} style={{ color: '#fff' }} />
                      </div>
                      <div>
                        <div className="account-name">{w.name}</div>
                        <div className="account-type">Fechamento em 05 abr</div>
                      </div>
                    </div>

                    <div className="custom-progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className={`animate-fade-in ${isTxFullscreen ? 'tx-fullscreen-view' : ''}`}>
      {!isTxFullscreen && (
        <>
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Visão Geral</h1>
              <p className="dashboard-subtitle">Acompanhamento: <span className="text-primary font-medium">{getDisplaySubtitle()}</span></p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" onClick={handleExportPDF}>
                <FileDown size={18} className="text-danger" /> PDF
              </button>
              <button className="btn btn-secondary" onClick={handleExportExcel}>
                <FileDown size={18} className="text-success" /> Excel
              </button>
              <button className="btn btn-primary" onClick={() => openNewTransaction('expense')}>
                <Plus size={18} /> Nova Transação
              </button>
            </div>
          </div>

          {renderInteractiveSelector()}

          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="stat-card glass-panel">
              <div className="stat-header">
                <span className="stat-title">Saldo no Período</span>
                <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}><Wallet size={20} /></div>
              </div>
              <div className="stat-value">{formatCurrency(filteredTotals.balance)}</div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-header">
                <span className="stat-title text-success">Receitas</span>
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}><ArrowUpRight size={20} /></div>
              </div>
              <div className="stat-value text-success">+{formatCurrency(filteredTotals.income)}</div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-header">
                <span className="stat-title text-danger">Despesas</span>
                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}><ArrowDownRight size={20} /></div>
              </div>
              <div className="stat-value text-danger">-{formatCurrency(filteredTotals.expense)}</div>
            </div>
            <div className="stat-card glass-panel" style={{ border: `1px solid ${healthScore > 70 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}` }}>
              <div className="stat-header">
                <span className="stat-title">Fync Score</span>
                <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}><Activity size={20} /></div>
              </div>
              <div className="stat-value">{healthScore} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/100</span></div>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: healthScore > 70 ? 'var(--success-color)' : 'var(--primary-color)' }}>
                {healthScore > 85 ? 'Gestão de Elite!' : healthScore > 70 ? 'Muito Bom!' : 'Pode melhorar'}
              </div>
            </div>
          </div>

          <div className="charts-section" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
              <h2 className="chart-title">Fluxo de Caixa Mensal</h2>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dynamicFlowData}>
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#272a37" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={(v) => `R$${v}`} />
                    <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#171923', border: 'none' }} />
                    <Area type="monotone" dataKey="Receitas" stroke="#10b981" fillOpacity={1} fill="url(#colorUv)" />
                    <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorPv)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
              <h2 className="chart-title">Distribuição de Gastos</h2>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      <Cell key="cell-0" fill="#10b981" />
                      <Cell key="cell-1" fill="#ef4444" />
                    </Pie>
                    <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#171923', borderColor: '#272a37' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
      {renderMainTransactionTable()}
    </div>
  );

  const PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#84cc16'];

  const pieData = useMemo(() => {
    const included = filteredTransactions.filter(t => !excludedCategories.includes(t.category));
    const totals = included.reduce((acc, curr) => {
      const amt = parseFloat(curr.amount) || 0;
      if (curr.type === 'income') acc.income += amt;
      else acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });

    return [
      { name: 'Receitas', value: totals.income },
      { name: 'Despesas', value: totals.expense }
    ];
  }, [filteredTransactions, excludedCategories]);
  const renderInstallments = () => {
    // Group transactions by "Installment Group" (matching titles or same shop)
    // For this POC, we group by unique combination of Title (without the X/Y part) and Amount (approx)
    const installmentGroups = transactions.reduce((acc, t) => {
      const info = parseInstallment(t.title);
      if (info.isInstallment && t.type === 'expense') {
        const baseTitle = t.title.replace(/(\d+)\s*[/]\s*(\d+)/, '').replace(/parcela\s*(\d+)\s*de\s*(\d+)/i, '').trim();
        const key = `${baseTitle}-${t.category}`;
        if (!acc[key]) {
          acc[key] = {
            id: key,
            title: baseTitle,
            category: t.category,
            totalInstallments: info.total,
            installments: [],
            walletId: t.walletId,
            totalValue: 0,
            paidValue: 0,
          };
        }
        acc[key].installments.push({ ...t, current: info.current });
        acc[key].totalValue = acc[key].totalInstallments * t.amount; // assuming equal installments
      }
      return acc;
    }, {});

    const groups = Object.values(installmentGroups).map(g => {
      // Sort installments by number
      g.installments.sort((a, b) => a.current - b.current);
      const latest = g.installments[g.installments.length - 1];
      g.currentInstallment = latest.current;
      g.monthlyAmount = parseFloat(latest.amount);

      // FIX GRAVE: Matemática determinística sem duplicidades e somas quebradas
      g.paidValue = g.currentInstallment * g.monthlyAmount;
      g.totalValue = g.totalInstallments * g.monthlyAmount;
      g.remainingValue = Math.max(0, g.totalValue - g.paidValue);
      g.progress = (g.currentInstallment / g.totalInstallments) * 100;
      g.isFinalized = g.currentInstallment >= g.totalInstallments;
      return g;
    });

    const activeGroups = groups.filter(g => !g.isFinalized);
    const finalizedGroups = groups.filter(g => g.isFinalized);
    const visibleGroups = activeInstallmentTab === 'active' ? activeGroups : finalizedGroups;

    const summary = groups.reduce((acc, g) => {
      acc.total += g.totalValue;
      acc.paid += g.paidValue;
      acc.remaining += g.remainingValue;
      if (!g.isFinalized) acc.activeCount += 1;
      else acc.finalizedCount += 1;
      return acc;
    }, { total: 0, paid: 0, remaining: 0, activeCount: 0, finalizedCount: 0 });

    const overallProgress = summary.total > 0 ? (summary.paid / summary.total) * 100 : 0;

    return (
      <div className="animate-fade-in parcelamentos-container">
        {/* Fync Redesigned Summary Card */}
        <div className="fync-parcelas-hero glass-panel">
          <div className="hero-main-info">
            <div className="hero-label">TOTAL EM ABERTO</div>
            <div className="hero-value">{formatCurrency(summary.remaining)}</div>
            <div className="hero-progress-track">
              <div className="hero-progress-fill" style={{ width: `${overallProgress}%` }}></div>
            </div>
            <div className="hero-progress-stats">
              <span>{overallProgress.toFixed(0)}% das parcelas pagas</span>
              <span><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Última em Dez/26</span>
            </div>
          </div>
          <div className="hero-side-stats">
            <div className="side-stat">
              <span className="side-label">VALOR TOTAL</span>
              <span className="side-val">{formatCurrency(summary.total)}</span>
            </div>
            <div className="side-stat">
              <span className="side-label">JÁ PAGO</span>
              <span className="side-val text-success">{formatCurrency(summary.paid)}</span>
            </div>
            <div className="side-stat">
              <span className="side-label">COMPRAS</span>
              <span className="side-val">{summary.activeCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs Refined */}
        <div className="pierre-filters" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`btn-pill ${activeInstallmentTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveInstallmentTab('active')}
          >
            Em andamento ({summary.activeCount})
          </button>
          <button
            className={`btn-pill ${activeInstallmentTab === 'finalized' ? 'active' : ''}`}
            onClick={() => setActiveInstallmentTab('finalized')}
          >
            Finalizadas ({summary.finalizedCount})
          </button>
        </div>

        {/* Redesigned Installment List */}
        <div className="fync-installment-grid">
          {visibleGroups.map(group => {
            const { icon: StoreIcon, color: iconColor, domain, isBrand } = getStoreIcon(group.title);
            const isExpanded = expandedInstallmentId === group.id;

            return (
              <div key={group.id} className={`fync-installment-card glass-panel ${isExpanded ? 'active' : ''}`}>
                <div className="card-main-content" onClick={() => setExpandedInstallmentId(isExpanded ? null : group.id)}>
                  <div className="card-side-badge">
                    <div className={`store-badge-circle ${isBrand ? 'brand-logo' : ''}`} style={{ backgroundColor: isBrand ? '#fff' : iconColor }}>
                      {isBrand ? (
                        <img
                          src={`https://logo.clearbit.com/${domain}?size=64`}
                          alt={group.title}
                          className="brand-logo-img"
                          onError={(e) => {
                            // If Clearbit fails, fallback to high-res favicon or simple icon
                            e.target.onerror = null;
                            e.target.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
                          }}
                        />
                      ) : (
                        <StoreIcon size={22} color="#fff" />
                      )}
                    </div>
                    <div className="badge-connection-line"></div>
                  </div>

                  <div className="card-core-info">
                    <div className="card-title-row">
                      <h3 className="card-title">{group.title}</h3>
                      <span className={`fync-status-pill ${group.isFinalized ? 'finalized' : 'active'}`}>
                        {group.isFinalized ? 'Concluído' : 'Ativo'}
                      </span>
                    </div>
                    <div className="card-meta-row">
                      <span className="meta-tag">{group.category}</span>
                      <span className="meta-separator">•</span>
                      <span className="meta-val">{group.currentInstallment}/{group.totalInstallments} parcelas</span>
                      <span className="meta-separator">•</span>
                      <span className="meta-val">{formatCurrency(group.monthlyAmount)}/mês</span>
                    </div>
                  </div>

                  <div className="card-action-info">
                    <div className="card-amount-total">
                      <span className="amount-label">{group.isFinalized ? 'Valor Total' : 'Restante'}</span>
                      <span className="amount-value">{formatCurrency(group.isFinalized ? group.totalValue : group.remainingValue)}</span>
                    </div>
                    <ChevronDown className={`chevron-fync ${isExpanded ? 'open' : ''}`} size={18} />
                  </div>
                </div>

                <div className="card-sub-progress">
                  <div className="fync-progress-bg">
                    <div className="fync-progress-fill" style={{ width: `${group.progress}%` }}></div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="fync-expanded-zone"
                    >
                      <div className="expanded-stats-grid">
                        <div className="exp-stat">
                          <span className="exp-label">Total</span>
                          <span className="exp-val">{formatCurrency(group.totalValue)}</span>
                        </div>
                        <div className="exp-stat">
                          <span className="exp-label">Pago até agora</span>
                          <span className="exp-val text-success">{formatCurrency(group.paidValue)}</span>
                        </div>
                        <div className="exp-stat">
                          <span className="exp-label">Progresso</span>
                          <span className="exp-val">{group.progress.toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="fync-timeline-list">
                        <div className="timeline-header">Fluxo de Pagamento</div>
                        {[...Array(group.totalInstallments)].map((_, idx) => {
                          const n = idx + 1;
                          const isPaid = n <= group.currentInstallment;
                          // Estimate month logic
                          const date = new Date();
                          date.setMonth(date.getMonth() - (group.currentInstallment - n));
                          const monthStr = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

                          return (
                            <div key={n} className={`fync-timeline-row ${isPaid ? 'paid' : ''}`}>
                              <div className="timeline-marker">
                                {isPaid ? <CheckCircle2 size={14} className="text-success" /> : <div className="marker-dot" />}
                              </div>
                              <div className="timeline-n">{n}ª parcela</div>
                              <div className="timeline-m">{monthStr}</div>
                              <div className="timeline-v">{formatCurrency(group.monthlyAmount)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className={`animate-fade-in ${isTxFullscreen ? 'tx-fullscreen-view' : ''}`}>
      {!isTxFullscreen && (
        <>
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Relatórios Detalhados</h1>
              <p className="dashboard-subtitle">Análise Financeira Completa e Leitura OFX.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".ofx" style={{ display: 'none' }} />
              <button className="btn btn-secondary" onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                <UploadCloud size={18} /> Importar OFX
              </button>
              <button className="btn btn-secondary" onClick={handleExportPDF}>
                <FileDown size={18} className="text-danger" /> PDF
              </button>
              <button className="btn btn-secondary" onClick={handleExportExcel}>
                <FileDown size={18} className="text-success" /> Excel
              </button>
            </div>
          </div>

          {renderInteractiveSelector()}

          {/* Cards de Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel stat-card">
              <div className="stat-header"><span className="stat-title">Saldo</span><div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-color)' }}><Wallet size={16} /></div></div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{formatCurrency(filteredTotals.balance)}</div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-header"><span className="stat-title text-success">Receitas</span><div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}><ArrowUpRight size={16} /></div></div>
              <div className="stat-value text-success" style={{ fontSize: '1.3rem' }}>+{formatCurrency(filteredTotals.income)}</div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-header"><span className="stat-title text-danger">Despesas</span><div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger-color)' }}><ArrowDownRight size={16} /></div></div>
              <div className="stat-value text-danger" style={{ fontSize: '1.3rem' }}>-{formatCurrency(filteredTotals.expense)}</div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-header"><span className="stat-title">Lançamentos</span><div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-color)' }}><FileText size={16} /></div></div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{filteredTransactions.length}</div>
            </div>
            <div className="glass-panel stat-card">
              <div className="stat-header"><span className="stat-title">Taxa de Poupança</span><div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}><TrendingUp size={16} /></div></div>
              <div className="stat-value" style={{ fontSize: '1.3rem', color: filteredTotals.income > 0 && (filteredTotals.income - filteredTotals.expense) / filteredTotals.income > 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {filteredTotals.income > 0 ? `${(((filteredTotals.income - filteredTotals.expense) / filteredTotals.income) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
            <div className="glass-panel stat-card" style={{ border: `1px solid ${healthScore > 70 ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
              <div className="stat-header"><span className="stat-title">Fync Score</span><div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary-color)' }}><Activity size={16} /></div></div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>{healthScore}<span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/100</span></div>
            </div>
          </div>

          {/* Gráficos: Barras por Categoria + Pizza */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
              <h2 className="chart-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} style={{ color: 'var(--primary-color)' }} /> Gastos por Categoria
              </h2>
              {dynamicCategoryData.length > 0 ? (
                <div style={{ width: '100%', height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dynamicCategoryData} layout="vertical" margin={{ left: 5, right: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#272a37" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" tickFormatter={v => `R$${v}`} fontSize={10} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" width={75} fontSize={11} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#171923', border: 'none', borderRadius: '8px' }} formatter={v => [formatCurrency(v), 'Gasto']} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {dynamicCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Nenhuma despesa registrada no período.
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
              <h2 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PieChart size={18} style={{ color: 'var(--primary-color)' }} /> Distribuição de Categorias
              </h2>
              {dynamicCategoryData.length > 0 ? (
                <>
                  <div style={{ width: '100%', height: 155 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={dynamicCategoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                          {dynamicCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#171923', border: 'none', borderRadius: '8px' }} formatter={v => [formatCurrency(v), 'Gasto']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem' }}>
                    {dynamicCategoryData.slice(0, 6).map((d, i) => {
                      const total = dynamicCategoryData.reduce((s, x) => s + x.value, 0);
                      const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <span className="text-muted">{d.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <span className="text-muted">{formatCurrency(d.value)}</span>
                            <span className="font-bold">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Nenhuma despesa registrada.
                </div>
              )}
            </div>
          </div>

          {/* Fluxo de Caixa */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem' }}>
            <h2 className="chart-title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary-color)' }} /> Fluxo de Caixa — Receitas vs Despesas
            </h2>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicFlowData}>
                  <defs>
                    <linearGradient id="repColorUv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="repColorPv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272a37" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" tickFormatter={v => `R$${v}`} fontSize={11} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#171923', border: 'none', borderRadius: '8px' }} formatter={v => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="Receitas" stroke="#10b981" fillOpacity={1} fill="url(#repColorUv)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#repColorPv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orçamento Mensal */}
          <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
            <h2 className="chart-title mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--primary-color)' }} />
              Orçamento Mensal — Travas de Gastos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {CATEGORIES.map(cat => {
                if (cat.id === 'Investimentos' || cat.id === 'Outros') return null;
                const limit = budgets[cat.id] || 0;
                const usedRaw = dynamicCategoryData.find(d => d.name === cat.id)?.value || 0;
                const progress = limit > 0 ? (usedRaw / limit) * 100 : 0;
                const isEditing = editingBudgetFor === cat.id;
                const isOver = limit > 0 && progress >= 100;

                return (
                  <div key={cat.id} style={{
                    background: isOver ? 'rgba(239, 68, 68, 0.07)' : 'rgba(255,255,255,0.03)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-lg)',
                    border: isOver ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                        <cat.icon size={14} style={{ color: isOver ? 'var(--danger-color)' : 'var(--primary-color)' }} />
                        {cat.id}
                      </span>
                      {isEditing ? (
                        <input
                          type="number" autoFocus size="5"
                          value={budgetTempVal}
                          onChange={e => setBudgetTempVal(e.target.value)}
                          onBlur={() => saveBudget(cat.id)}
                          onKeyDown={e => { if (e.key === 'Enter') saveBudget(cat.id); }}
                          className="input-field" style={{ padding: '2px 5px', width: '70px', fontSize: '0.8rem' }}
                        />
                      ) : (
                        <button onClick={() => { setEditingBudgetFor(cat.id); setBudgetTempVal(String(limit || '')); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', cursor: 'pointer' }}>
                          {limit > 0 ? formatCurrency(limit) : '+ Definir Meta'}
                        </button>
                      )}
                    </div>
                    {limit > 0 && (
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '0.3rem' }}>
                        <div style={{ width: `${Math.min(progress, 100)}%`, height: '100%', background: isOver ? 'var(--danger-color)' : 'var(--success-color)', borderRadius: '2px' }} />
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: isOver ? 'var(--danger-color)' : 'var(--text-muted)', marginTop: '0.3rem' }}>
                      {limit > 0 ? `${formatCurrency(usedRaw)} / ${formatCurrency(limit)} (${progress.toFixed(0)}%)` : 'Meta não definida'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // --- Pierre Inspired Range Picker Component ---
  const renderRangePicker = () => {
    if (!isRangePickerOpen) return null;

    const presets = [
      { label: 'Todo período', value: 'all' },
      { label: 'Últimos 30 dias', value: '30days' },
      { label: 'Últimos 90 dias', value: '90days' },
      { label: 'Este mês', value: 'thisMonth' },
      { label: 'Mês passado', value: 'lastMonth' },
      { label: 'Últimos 6 meses', value: '6months' },
      { label: 'Este ano', value: 'thisYear' },
      { label: 'Ano passado', value: 'lastYear' },
    ];

    const applyPreset = (preset) => {
      const today = new Date();
      let start = new Date();
      let end = new Date();

      switch (preset) {
        case '30days': start.setDate(today.getDate() - 30); break;
        case '90days': start.setDate(today.getDate() - 90); break;
        case 'thisMonth':
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case 'lastMonth':
          start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          end = new Date(today.getFullYear(), today.getMonth(), 0);
          break;
        case '6months': start.setMonth(today.getMonth() - 6); break;
        case 'thisYear': start = new Date(today.getFullYear(), 0, 1); break;
        case 'lastYear':
          start = new Date(today.getFullYear() - 1, 0, 1);
          end = new Date(today.getFullYear() - 1, 11, 31);
          break;
        case 'all':
          start = new Date(2020, 0, 1);
          break;
      }

      setFilterStartDate(start.toISOString().split('T')[0]);
      setFilterEndDate(end.toISOString().split('T')[0]);
      setFilterMode('period');
    };

    const renderCalendar = (monthOffset) => {
      const date = new Date();
      date.setMonth(date.getMonth() + monthOffset);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="day-cell empty"></div>);
      for (let d = 1; d <= daysInMonth; d++) {
        const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isSelected = currentStr === filterStartDate || currentStr === filterEndDate;
        const isInRange = currentStr >= filterStartDate && currentStr <= filterEndDate;

        days.push(
          <div
            key={d}
            className={`day-cell ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''}`}
            onClick={() => {
              if (!filterStartDate || (filterStartDate && filterEndDate)) {
                setFilterStartDate(currentStr);
                setFilterEndDate('');
              } else {
                if (currentStr < filterStartDate) {
                  setFilterEndDate(filterStartDate);
                  setFilterStartDate(currentStr);
                } else {
                  setFilterEndDate(currentStr);
                }
              }
            }}
          >
            {d}
          </div>
        );
      }

      return (
        <div className="calendar-month-view">
          <div className="calendar-header">
            <span>{monthName} {year}</span>
          </div>
          <div className="calendar-days-grid">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => <div key={day} className="day-header">{day}</div>)}
            {days}
          </div>
        </div>
      );
    };

    return (
      <div className="range-picker-overlay" onClick={() => setIsRangePickerOpen(false)}>
        <div className="range-picker-content animate-slide-in" onClick={e => e.stopPropagation()}>
          <div className="range-picker-body">
            <div className="range-picker-sidebar">
              {presets.map(p => (
                <button key={p.value} className="preset-btn" onClick={() => applyPreset(p.value)}>{p.label}</button>
              ))}
            </div>
            <div className="range-picker-main">
              <div className="calendar-grid-dual">
                {renderCalendar(-1)}
                {renderCalendar(0)}
              </div>
            </div>
          </div>
          <div className="range-picker-footer">
            <div className="range-summary">
              {filterStartDate ? new Date(filterStartDate).toLocaleDateString('pt-BR') : '...'} - {filterEndDate ? new Date(filterEndDate).toLocaleDateString('pt-BR') : '...'}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsRangePickerOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => setIsRangePickerOpen(false)} style={{ background: 'var(--success-color)' }}>Aplicar</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactions = () => {
    return (
      <div className={`animate-fade-in ${isTxFullscreen ? 'tx-fullscreen-view' : ''}`}>
        {!isTxFullscreen && (
          <>
            <div className="dashboard-header" style={{ marginBottom: '1.5rem', marginTop: '3.5rem' }}>
              <div>
                <h1 className="dashboard-title">Transações Inteligentes</h1>
                <p className="dashboard-subtitle">Monitoramento em tempo real do seu fluxo de caixa.
                  {filterCategory && <span style={{ marginLeft: '0.5rem', background: 'var(--primary-color)', color: '#fff', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>{filterCategory} <button onClick={() => setFilterCategory(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '4px', lineHeight: 1 }}>✕</button></span>}
                </p>
              </div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".ofx" style={{ display: 'none' }} />
                <input type="file" ref={pdfImportRef} onChange={handlePDFImport} accept=".pdf" style={{ display: 'none' }} />
                <input type="file" ref={excelImportRef} onChange={handleExcelImport} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />
                <button className="btn btn-secondary" onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59,130,246,0.5)', color: '#60a5fa' }}>
                  <UploadCloud size={16} /> OFX
                </button>
                <button className="btn btn-secondary" onClick={() => pdfImportRef.current && pdfImportRef.current.click()} style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.5)', color: '#f87171' }}>
                  <FileDown size={16} /> PDF
                </button>
                <button className="btn btn-secondary" onClick={() => excelImportRef.current && excelImportRef.current.click()} style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.5)', color: '#34d399' }}>
                  <FileDown size={16} /> Excel
                </button>
                <button className="btn btn-primary" onClick={() => openNewTransaction('expense')}>
                  <Plus size={18} /> Nova Transação
                </button>
              </div>
            </div>

            {/* Summary Cards (Pierre Style) */}
            <div className="tx-summary-cards">
              <div className="tx-hero-card glass-panel">
                <div className="tx-stat-group">
                  <span className="tx-stat-label">Total de Lançamentos</span>
                  <span className="tx-stat-value"># {txTotals.total}</span>
                </div>
                <div className="tx-stat-group text-right">
                  <span className="tx-stat-label">Receitas do Período</span>
                  <span className="tx-stat-value text-success">{formatCurrency(txTotals.income)}</span>
                  <div className="tx-stat-sub text-success"><ArrowUpRight size={14} /> Fluxo Positivo</div>
                </div>
              </div>
              <div className="tx-hero-card glass-panel">
                <div className="tx-stat-group">
                  <span className="tx-stat-label">Despesas Totais</span>
                  <span className="tx-stat-value text-danger">{formatCurrency(txTotals.expense)}</span>
                  <div className="tx-stat-sub text-danger"><ArrowDownRight size={14} /> Saídas no período</div>
                </div>
                <div className="tx-stat-group text-right">
                  <span className="tx-stat-label">Saldo Líquido</span>
                  <span className="tx-stat-value">{formatCurrency(txTotals.income - txTotals.expense)}</span>
                </div>
              </div>
            </div>

            {/* Smart Filter Bar */}
            <div className="tx-smart-filters">
              <div
                className="filter-select flex items-center gap-2"
                onClick={() => setIsRangePickerOpen(true)}
              >
                <Calendar size={16} className="text-primary" />
                {filterMode === 'month' ? filterMonth : 'Intervalo Personalizado'}
              </div>

              <select className="filter-select" value={txWallet} onChange={e => setTxWallet(e.target.value)}>
                <option value="Todas">Todas as Contas</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>

              <select className="filter-select" value={txType} onChange={e => setTxType(e.target.value)}>
                <option value="Todas">Todas Transações</option>
                <option value="Receitas">Receitas</option>
                <option value="Despesas">Despesas</option>
              </select>

              <select className="filter-select" value={txSort} onChange={e => setTxSort(e.target.value)}>
                <option value="recentes">Data (Mais recentes)</option>
                <option value="antigas">Data (Mais antigas)</option>
                <option value="valor-maior">Valor (Maior)</option>
                <option value="valor-menor">Valor (Menor)</option>
              </select>

              <select className="filter-select" value={txCategory} onChange={e => setTxCategory(e.target.value)}>
                <option value="Todas">Categorias</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
              </select>

              <div className="tx-search-container">
                <Search className="tx-search-icon" size={16} />
                <input
                  type="text"
                  className="tx-search-input"
                  placeholder="Buscar transações..."
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {renderMainTransactionTable()}
        {renderRangePicker()}
      </div>
    );
  };

  // --- B3 IMPORTER ---
  const parseB3Excel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        let mapped = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          // Normalize helper to remove accents for comparisons
          const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

          // Extended B3 keywords: covers both Movimentações and Proventos formats
          const B3_KEYWORDS = ['data', 'produto', 'ticker', 'codigo', 'quantidade', 'valor', 'evento', 'movimenta', 'previsao', 'pagamento'];
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
            const rowClean = norm(rawRows[i].join(' '));
            const hits = B3_KEYWORDS.filter(kw => rowClean.includes(kw));
            if (hits.length >= 1) { // Only need 1 hit now — file has no metadata rows
              headerRowIdx = i; break;
            }
          }
          if (headerRowIdx === -1) continue;

          const headers = rawRows[headerRowIdx].map(h => norm(h));
          const colIdx = (...cands) => {
            for (const c of cands) {
              const idx = headers.findIndex(h => h.includes(c));
              if (idx !== -1) return idx;
            }
            return -1;
          };

          // Support BOTH B3 formats:
          // Proventos:    Produto | Tipo | Tipo de Evento | Previsão de pagamento | ... | Quantidade | Preço unitário | Valor líquido
          // Movimentações: Data | Movimentação | Produto/Código | Quantidade | Preço | Valor
          const iDate = colIdx('previsao', 'pagamento', 'data', 'date');
          const iMov = colIdx('tipo de evento', 'movimenta', 'evento', 'tipo de neg');
          const iTicker = colIdx('produto', 'codigo de negociacao', 'ticker', 'codigo', 'ativo');
          const iQty = colIdx('quantidade', 'qtd');
          const iPrice = colIdx('preco unitario', 'preco', 'cotacao', 'unit');
          const iTotal = colIdx('valor liquido', 'valor de operacao', 'valor total', 'montante', 'financeiro', 'valor');

          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.every(c => c === '' || c == null)) continue;

            const rawDate = iDate >= 0 ? row[iDate] : '';
            const movType = String(iMov >= 0 ? row[iMov] || '' : '');
            const rawProd = String(iTicker >= 0 ? row[iTicker] || '' : '');
            const rawQty = String(iQty >= 0 ? row[iQty] || '1' : '1');
            const rawPrice = String(iPrice >= 0 ? row[iPrice] || '0' : '0');
            const rawTotal = String(iTotal >= 0 ? row[iTotal] || '0' : '0');

            // Extract ticker: "BBDC4 - BANCO BRADESCO S/A" → "BBDC4"
            const ticker = rawProd.split(/[-\s]/)[0].toUpperCase().trim();
            if (!ticker || ticker.length < 3 || ticker === 'TOTAL') continue;

            const quantity = parseFloat(rawQty.replace(',', '.')) || 1;
            const price = parseFloat(rawPrice.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
            let total = parseFloat(rawTotal.replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0;
            if (!total && price) total = price * quantity;
            if (Math.abs(total) === 0) continue;

            // Parse date
            let dateStr = '';
            if (rawDate instanceof Date) {
              dateStr = rawDate.toISOString().split('T')[0];
            } else {
              const s = String(rawDate).trim();
              // DD/MM/YYYY
              const parts = s.split('/');
              if (parts.length === 3) {
                const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
                dateStr = `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              } else {
                // Excel serial number
                const num = Number(s);
                if (!isNaN(num) && num > 40000) {
                  const d = new Date(Math.round((num - 25569) * 86400 * 1000));
                  dateStr = d.toISOString().split('T')[0];
                } else {
                  // YYYY-MM-DD already?
                  dateStr = s.match(/\d{4}-\d{2}-\d{2}/) ? s : new Date().toISOString().split('T')[0];
                }
              }
            }

            const ml = norm(movType);
            const isDividend = ml.includes('dividend') || ml.includes('jcp') || ml.includes('juros sobre capital') || ml.includes('rendimento') || ml.includes('provento') || ml.includes('amortizac') || ml.includes('remuneracao');
            const isSell = ml.includes('venda') || ml.includes('aliena');
            const isBuy = ml.includes('compra') || ml.includes('subscri') || ml.includes('aquisicao');

            mapped.push({
              date: dateStr, ticker, movType, quantity, price,
              total: Math.abs(total),
              type: isDividend ? 'income' : isSell ? 'income' : 'expense',
              label: isDividend ? 'Dividendo/JCP' : isBuy ? 'Compra' : isSell ? 'Venda' : (movType || 'Movimenta\u00e7\u00e3o'),
            });
          }
          if (mapped.length > 0) break;
        }

        if (mapped.length === 0) {
          alert('Nenhuma movimenta\u00e7\u00e3o detectada.\n\nVerifique se o arquivo \u00e9 o extrato de Proventos ou Movimenta\u00e7\u00f5es da B3 com colunas: Produto, Quantidade e Valor.');
          setB3Preview(null);
        } else {
          setB3Preview({ rows: mapped });
        }
      } catch (err) {
        alert('Erro ao ler o arquivo. Verifique se \u00e9 um .xlsx v\u00e1lido da B3.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleB3Import = async () => {
    if (!b3Preview) return;
    setB3Importing(true);
    for (const row of b3Preview.rows) {
      await addTransaction({
        title: `${row.label} ${row.ticker} (${row.quantity} cota${row.quantity > 1 ? 's' : ''})`,
        amount: row.total,
        type: row.type,
        category: 'Investimentos',
        subCategory: row.type === 'income' ? 'Dividendos / JCP' : 'A\u00e7\u00f5es',
        ticker: row.ticker,
        date: row.date || new Date().toISOString().split('T')[0],
        walletId: wallets[0]?.id || '',
        description: `Importado via B3 | Tipo: ${row.movType}`,
      });
    }
    setB3Importing(false);
    setB3Preview(null);
    setIsB3ImportOpen(false);
    alert(`\u2705 ${b3Preview.rows.length} movimenta\u00e7\u00f5es importadas com sucesso!`);
  };

  const fetchStockQuotes = async (tickers) => {
    if (!tickers || tickers.length === 0) {
      showToast('Nenhum ativo para atualizar.', 'info');
      return;
    }
    setIsQuotesLoading(true);
    try {
      const cleanTickersArr = tickers.map(t => {
        let ticker = String(t).split('-')[0].trim().toUpperCase();
        if (ticker && !ticker.includes('.')) {
          return `${ticker}.SA`;
        }
        return ticker;
      });

      const newQuotes = {};

      // Busca paralela para cada ticker no Yahoo Finance via proxy
      const promises = cleanTickersArr.map(async (ticker) => {
        try {
          const response = await fetch(`/api/yahoo/v8/finance/chart/${ticker}?interval=1d&range=1d`);
          if (!response.ok) return null;
          const data = await response.json();
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

          if (price) {
            newQuotes[ticker] = price;
            // Guardar também sem o sufixo .SA para fácil mapeamento
            const baseSymbol = ticker.split('.')[0];
            newQuotes[baseSymbol] = price;
            return true;
          }
        } catch (err) {
          console.warn(`Erro ao buscar cotação para ${ticker}:`, err);
        }
        return null;
      });

      await Promise.all(promises);

      if (Object.keys(newQuotes).length > 0) {
        setStockQuotes(prev => ({ ...prev, ...newQuotes }));
        showToast(`✅ ${Object.keys(newQuotes).length / 2} ativos atualizados.`);
      } else {
        showToast('Nenhuma cotação encontrada. Verifique os tickers.', 'warning');
      }
    } catch (err) {
      console.error('Erro ao buscar cotações:', err);
      showToast('API de Cotações indisponível no momento.', 'error');
    } finally {
      setIsQuotesLoading(false);
    }
  };

  const handleBulkCategoryUpdate = async (newCat) => {
    if (selectedIds.length === 0) return;
    const res = await bulkUpdateCategory(selectedIds, newCat);
    if (res.success) {
      showToast(`✅ Categoria de ${selectedIds.length} lançamentos atualizada.`);
      setSelectedIds([]);
      setIsBulkCategoryModalOpen(false);
    } else {
      showToast(`Erro: ${res.message}`, 'error');
    }
  };

  const renderInvestments = () => {
    const investmentTxs = transactions.filter(t => t.category === 'Investimentos');

    // Portfolio Consolidation Logic
    const portfolio = investmentTxs.reduce((acc, t) => {
      if (!t.ticker) return acc;
      if (!acc[t.ticker]) acc[t.ticker] = { ticker: t.ticker, quantity: 0, totalInvested: 0, dividends: 0, category: t.category };

      if (t.type === 'expense') {
        const qtyMatch = t.title.match(/(\d+)\s+cotas/i) || t.title.match(/(\d+)\s+units/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        acc[t.ticker].quantity += qty;
        acc[t.ticker].totalInvested += t.amount;
      } else {
        acc[t.ticker].dividends += t.amount;
      }
      return acc;
    }, {});

    const portfolioList = Object.values(portfolio).filter(p => p.quantity > 0 || p.dividends > 0);
    const totalInvestedPortfolio = portfolioList.reduce((sum, p) => sum + p.totalInvested, 0);
    const totalDividendsAccumulated = portfolioList.reduce((sum, p) => sum + p.dividends, 0);

    // Data for Allocation Chart
    const allocationData = INVESTMENT_CATEGORIES.map(cat => {
      const value = investmentTxs
        .filter(t => t.title.toLowerCase().includes(cat.id.toLowerCase()) || t.category === cat.id)
        .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
      return { name: cat.id, value };
    }).filter(d => d.value > 0);

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Market Ticker Tape */}
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.5rem 0', scrollbarWidth: 'none' }}>
          {Object.values(marketIndices).map(idx => (
            <div key={idx.label} className="glass-panel" style={{ padding: '0.75rem 1.25rem', minWidth: '180px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px' }}>{idx.label}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>{idx.value}</div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: idx.change.includes('+') ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {idx.change}
              </div>
            </div>
          ))}
          <button className="btn btn-secondary mini" style={{ minWidth: '120px' }} onClick={fetchMarketIndices}>
            <RefreshCw size={14} className={isQuotesLoading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>

        <div className="dashboard-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="dashboard-title">Hub do Investidor <span style={{ fontSize: '0.9rem', verticalAlign: 'middle', opacity: 0.5 }}>v1.6</span></h1>
            <p className="dashboard-subtitle">Monitoramento em tempo real, notícias e evolução patrimonial.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => setIsB3ImportOpen(true)}>
              <FileDown size={16} /> Importar B3
            </button>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => openNewTransaction('expense', 'Investimentos')}>
              <Plus size={16} /> Novo Ativo
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
          {/* Main Content Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Evolution Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', height: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Evolução do Patrimônio</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Últimos 12 meses (Custo)</div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={investmentEvolutionData}>
                  <defs>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis hide />
                  <RechartsTooltip
                    contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(val) => [formatCurrency(val), 'Investido']}
                  />
                  <Area type="monotone" dataKey="invested" stroke="var(--primary-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorInvested)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Portfolio Summary Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
              <div className="stat-card">
                <div className="stat-header"><span className="stat-title">Patrimônio Atual</span><TrendingUp size={20} color="var(--primary-color)" /></div>
                <div className="stat-value" style={{ fontSize: '1.75rem' }}>{formatCurrency(totalInvestedPortfolio)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span className="stat-title">Proventos Totais</span><ArrowUpRight size={20} color="var(--success-color)" /></div>
                <div className="stat-value" style={{ fontSize: '1.75rem', color: 'var(--success-color)' }}>{formatCurrency(totalDividendsAccumulated)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span className="stat-title">Rentabilidade</span><Activity size={20} color="#818cf8" /></div>
                <div className="stat-value" style={{ fontSize: '1.75rem' }}>{(totalInvestedPortfolio > 0 ? (totalDividendsAccumulated / totalInvestedPortfolio * 100) : 0).toFixed(2)}%</div>
              </div>
            </div>

            {/* Portfolio Table */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Meus Ativos</h3>
                <button className="btn-icon mini" onClick={() => fetchStockQuotes(portfolioList.map(p => p.ticker))}><RefreshCw size={16} /></button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ativo</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Qtd</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Preço Médio</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Atual</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioList.map(p => {
                      const currentPrice = stockQuotes[p.ticker] || stockQuotes[p.ticker?.split('.')[0]] || 0;
                      const avgPrice = p.quantity > 0 ? p.totalInvested / p.quantity : 0;
                      const currentValue = p.quantity * currentPrice;
                      const pl = currentValue - p.totalInvested;
                      const plPercent = p.totalInvested > 0 ? (pl / p.totalInvested) * 100 : 0;

                      return (
                        <tr key={p.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{p.ticker}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.category}</div>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>{p.quantity}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(avgPrice)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{currentPrice > 0 ? formatCurrency(currentPrice) : '---'}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{currentPrice > 0 ? formatCurrency(currentValue) : formatCurrency(p.totalInvested)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: pl >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                            {pl >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Area: News & Allocation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* News Panel */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#818cf8' }}>
                <Globe2 size={18} />
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notícias</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {marketNews.map(news => (
                  <div key={news.id} className="news-item-hover" style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', lineHeight: '1.3' }}>{news.title}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>{news.source}</span>
                      <span>{news.date}</span>
                    </div>
                  </div>
                ))}
                <button className="btn btn-secondary mini" style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.7rem' }}>Ver Mais Notícias</button>
              </div>
            </div>

            {/* Allocation Chart */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>Alocação</h3>
              <div style={{ height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* B3 Import Panel */}
        {isB3ImportOpen && (
          <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px dashed rgba(59,130,246,0.5)', background: 'rgba(59,130,246,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 className="font-bold flex items-center gap-2" style={{ color: '#3b82f6' }}>
                  <FileDown size={20} /> Importar Extrato da B3 (Excel)
                </h3>
                <p className="text-sm text-muted mt-1">Acesse o site da B3 → Extrato → Gere o arquivo .xlsx e arraste aqui abaixo.</p>
              </div>
              <button className="btn-icon" onClick={() => { setIsB3ImportOpen(false); setB3Preview(null); }}><X size={20} /></button>
            </div>

            {/* Drag & Drop Zone */}
            {!b3Preview && (
              <div
                onDragOver={e => { e.preventDefault(); setB3DragOver(true); }}
                onDragLeave={() => setB3DragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setB3DragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) parseB3Excel(file);
                }}
                style={{
                  border: `2px dashed ${b3DragOver ? '#3b82f6' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '3rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: b3DragOver ? 'rgba(59,130,246,0.07)' : 'transparent',
                  transition: 'all 0.2s'
                }}
                onClick={() => document.getElementById('b3-file-input').click()}
              >
                <FileDown size={36} style={{ margin: '0 auto 0.75rem', color: '#3b82f6', opacity: 0.7 }} />
                <p className="font-medium">Arraste o arquivo Excel aqui</p>
                <p className="text-sm text-muted mt-1">ou clique para selecionar</p>
                <input id="b3-file-input" type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) parseB3Excel(f); }} />
              </div>
            )}

            {/* Preview Table */}
            {b3Preview && (
              <div>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p className="font-medium text-success">✅ {b3Preview.rows.length} movimentações detectadas</p>
                  <button className="btn btn-secondary text-sm" onClick={() => setB3Preview(null)}>Cancelar</button>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto', marginBottom: '1rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Data</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Ticker</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tipo</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Qtd</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b3Preview.rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.5rem' }}>{r.date}</td>
                          <td style={{ padding: '0.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{r.ticker}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', background: r.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: r.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)' }}>{r.label}</span>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>{r.quantity}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '1rem' }}
                  onClick={handleB3Import}
                  disabled={b3Importing}
                >
                  {b3Importing ? 'Importando...' : 'Confirmar Importação'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderWallets = () => {
    const totalPatrimony = wallets.reduce((acc, w) => {
      if (w.type === 'checking') return acc + (parseFloat(w.dynamicBalance) || 0);
      return acc;
    }, 0);

    const totalCreditAvailable = wallets.reduce((acc, w) => {
      if (w.type === 'credit') {
        const available = (parseFloat(w.limit) || 0) + (parseFloat(w.dynamicBalance) || 0);
        return acc + Math.max(available, 0);
      }
      return acc;
    }, 0);

    const totalFaturas = wallets.reduce((acc, w) => {
      if (w.type === 'credit') return acc + (parseFloat(w.dynamicBalance) || 0);
      return acc;
    }, 0);

    const PATRIMONY_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];
    const checkingWallets = wallets.filter(w => w.type === 'checking' && w.dynamicBalance > 0);
    const checkingPieData = checkingWallets.map((w, i) => ({
      name: w.name,
      value: w.dynamicBalance,
      fill: PATRIMONY_COLORS[i % PATRIMONY_COLORS.length]
    }));

    // Historic Chart Real Data
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const historicData = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const targetMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const faturasVal = transactions.filter(t => {
        const tDateParts = t.date.split('-');
        if (tDateParts.length < 2) return false;
        const tMonthStr = `${tDateParts[0]}-${tDateParts[1]}`;
        if (tMonthStr !== targetMonthStr) return false;
        if (t.type !== 'expense') return false;
        const w = wallets.find(w => w.id === t.walletId);
        return w && w.type === 'credit';
      }).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      return {
        name: monthNames[d.getMonth()],
        value: faturasVal
      };
    });

    return (
      <div className="animate-fade-in dashboard-wallets-view">
        <div className="dashboard-header mb-6">
          <div>
            <h1 className="dashboard-title">Minhas Carteiras</h1>
            <p className="dashboard-subtitle">Acompanhamento contábil de contas e faturas de cartão.</p>
          </div>
        </div>

        {/* Pierre Hero Cards for Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {/* Faturas Card */}
          <div className="glass-panel" style={{
            padding: '3rem 2rem', borderRadius: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(180deg, rgba(239,68,68,0.1) 0%, rgba(20,20,30,0.8) 100%)'
          }}>
            <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 60%)', zIndex: 0 }} />
            <span className="text-muted text-sm uppercase tracking-wider mb-2" style={{ zIndex: 1 }}><CreditCard size={14} style={{ display: 'inline', marginRight: 6 }} /> Fatura Atual Total</span>
            <h2 style={{ fontSize: '3rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', zIndex: 1, color: '#f87171' }}>
              {formatCurrency(totalFaturas < 0 ? Math.abs(totalFaturas) : totalFaturas)}
            </h2>
          </div>

          {/* Patrimony Card */}
          <div className="glass-panel" style={{
            padding: '2rem', borderRadius: '24px', position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(23,25,35,0.6) 100%)'
          }}>
            <div style={{ zIndex: 1, flex: 1 }}>
              <span className="text-muted text-sm uppercase tracking-wider mb-2" style={{ display: 'block' }}><Wallet size={14} style={{ display: 'inline', marginRight: 6 }} /> Patrimônio Líquido</span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
                {formatCurrency(totalPatrimony)}
              </h2>
            </div>
            <div style={{ width: '140px', height: '140px', zIndex: 1, position: 'relative' }}>
              {checkingPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={checkingPieData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none" cornerRadius={6}>
                      {checkingPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#171923', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted" style={{ fontSize: '0.8rem' }}>Sem fundos</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-muted" />
            <span className="text-muted font-bold text-sm tracking-wide">SUAS CARTEIRAS E CARTÕES ({wallets.length})</span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setIsTransferModalOpen(true)} style={{ borderRadius: '24px', padding: '0.6rem 1.2rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
              <ArrowRightLeft size={16} /> Transferir
            </button>
            <button className="btn btn-primary" onClick={openNewWallet} style={{ borderRadius: '24px', padding: '0.6rem 1.5rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}>
              + Nova Carteira
            </button>
          </div>
        </div>

        <div className="stats-grid mb-8">
          {wallets.map(w => {
            const isNegativeAlert = w.dynamicBalance < 0 && w.type === 'checking';
            const { domain, isBrand, icon: FallbackIcon, color: iconColor } = getStoreIcon(w.name);
            const isExpanded = expandedWallet === w.id;
            const wTxs = transactions.filter(t => t.walletId === w.id);
            const wTxsSorted = [...wTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);

            return (
              <div key={w.id} className="stat-card glass-panel"
                onClick={() => setExpandedWallet(isExpanded ? null : w.id)}
                style={{
                  background: isExpanded ? 'linear-gradient(135deg, rgba(30,30,35,1), rgba(40,40,45,1))' : 'linear-gradient(135deg, rgba(20,20,25,1), rgba(30,30,35,1))',
                  borderRadius: '16px',
                  position: 'relative',
                  border: isNegativeAlert ? '1px solid var(--danger-color)' : '1px solid rgba(255,255,255,0.05)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                  <button className="btn-icon circle-btn" onClick={(e) => { e.stopPropagation(); openEditWallet(w); }} style={{ background: 'rgba(255,255,255,0.05)' }} title="Editar"><Edit2 size={14} /></button>
                  <button className="btn-icon circle-btn" onClick={(e) => { e.stopPropagation(); handleDeleteWallet(w); }} style={{ background: 'rgba(239, 68, 68, 0.1)' }} title="Excluir"><Trash2 size={14} className="text-danger" /></button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center" style={{ width: 44, height: 44, background: iconColor, borderRadius: '12px', overflow: 'hidden' }}>
                    {isBrand ? (
                      <img
                        src={`https://logo.clearbit.com/${domain}?size=64`}
                        alt={w.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.onerror = null; e.target.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`; }}
                      />
                    ) : (
                      <FallbackIcon size={20} color="#fff" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{w.name}</h3>
                    <span className="text-xs text-muted">
                      {w.type === 'checking' ? 'Conta Corrente' : 'Cartão de Crédito'}
                    </span>
                  </div>
                </div>

                {w.type === 'checking' ? (
                  <div className="mt-2">
                    <div className="text-xs text-muted mb-1">Saldo Computado</div>
                    <div className="text-2xl font-bold font-display" style={{ color: isNegativeAlert ? 'var(--danger-color)' : 'inherit' }}>
                      {formatCurrency(w.dynamicBalance || 0)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="text-xs text-muted mb-1">Fatura Atual</div>
                    <div className="text-2xl font-bold font-display">{formatCurrency(w.dynamicBalance || 0)}</div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-muted mb-1">
                        <span>Limite Total: {formatCurrency(w.limit || 0)}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', display: 'flex', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--primary-color)', height: '100%', width: `${Math.min((Math.abs(w.dynamicBalance || 0) / (w.limit || 1)) * 100, 100)}%` }} />
                        <div style={{ background: 'var(--success-color)', height: '100%', flex: 1 }} />
                      </div>
                      <div className="flex justify-between text-xs mt-2">
                        <span style={{ color: 'var(--primary-color)' }}>Usado</span>
                        <span style={{ color: 'var(--success-color)' }}>Livre</span>
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }} onClick={e => e.stopPropagation()}>
                    <h4 className="font-bold text-sm mb-3">Últimas Movimentações</h4>
                    {wTxsSorted.length === 0 ? (
                      <div className="text-muted text-xs">Nenhuma movimentação encontrada.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {wTxsSorted.map(tx => (
                          <div key={tx.id} onClick={() => openEditTransaction(tx)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tx.title}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: tx.type === 'income' ? 'var(--success-color)' : 'var(--text-main)' }}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Faturas Históricas Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '24px' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center gap-2"><BarChart2 size={18} /> Faturas anteriores</h3>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12 }} tickFormatter={v => `R$${v > 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#171923', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} activeBar={{ fill: '#fff' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderSubscriptions = () => {
    // Calculate Summary Stats
    const activeSubs = subscriptions.filter(s => s.isActive);
    const totalMonthly = activeSubs.reduce((sum, s) => sum + s.amount, 0);
    const totalYearly = totalMonthly * 12;
    const activeCount = activeSubs.length;
    const averagePerSub = activeCount > 0 ? totalMonthly / activeCount : 0;

    // Filtered list
    const filteredSubs = subscriptions.filter(s => {
      if (activeSubTab === 'active') return s.isActive;
      if (activeSubTab === 'inactive') return !s.isActive;
      return true;
    });

    return (
      <div className="animate-fade-in">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Assinaturas e Recorrências</h1>
            <p className="dashboard-subtitle">Gestão inteligente de serviços fixos e mensais.</p>
          </div>
          <button className="btn btn-primary" onClick={openSubModal}><Plus size={18} /> Nova Assinatura</button>
        </div>

        {/* Fync Premium Subs Hero */}
        <div className="fync-subs-hero glass-panel">
          <div className="hero-main-info">
            <span className="hero-label">GASTO MENSAL TOTAL</span>
            <div className="hero-value">{formatCurrency(totalMonthly)}</div>
            <div className="hero-progress-track">
              <div className="hero-progress-fill" style={{ width: '100%', opacity: 0.8 }}></div>
            </div>
            <div className="hero-progress-stats">
              <span>Faturamento recorrente do mês atual</span>
              <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Atualizado agora</span>
            </div>
          </div>
          <div className="hero-side-stats">
            <div className="side-stat">
              <span className="side-label">PROJEÇÃO ANUAL</span>
              <span className="side-val text-warning">{formatCurrency(totalYearly)}</span>
            </div>
            <div className="side-stat">
              <span className="side-label">SERVIÇOS ATIVOS</span>
              <span className="side-val">{activeCount}</span>
            </div>
            <div className="side-stat">
              <span className="side-label">MÉDIA POR SERVIÇO</span>
              <span className="side-val text-success">{formatCurrency(averagePerSub)}</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs Refined */}
        <div className="pierre-filters" style={{ marginBottom: '1.5rem' }}>
          <button
            className={`btn-pill ${activeSubTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('all')}
          >
            Todas ({subscriptions.length})
          </button>
          <button
            className={`btn-pill ${activeSubTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('active')}
          >
            Ativas ({activeCount})
          </button>
          <button
            className={`btn-pill ${activeSubTab === 'inactive' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('inactive')}
          >
            Inativas ({subscriptions.length - activeCount})
          </button>
        </div>

        {/* Redesigned Subscription List */}
        <div className="fync-installment-grid">
          {filteredSubs.length === 0 ? (
            <div className="glass-panel text-center text-muted py-12" style={{ borderRadius: 'var(--radius-xl)' }}>
              Nenhuma assinatura encontrada nesta categoria.
            </div>
          ) : (
            filteredSubs.map(sub => {
              const { domain, isBrand, icon: FallbackIcon, color: iconColor } = getStoreIcon(sub.name);

              return (
                <div key={sub.id} className={`fync-installment-card glass-panel ${!sub.isActive ? 'inactive-sub' : ''}`} style={{ opacity: sub.isActive ? 1 : 0.7 }}>
                  <div className="card-main-content">
                    <div className="card-side-badge">
                      <div className={`store-badge-circle ${isBrand ? 'brand-logo' : ''}`} style={{ backgroundColor: isBrand ? '#fff' : iconColor }}>
                        {isBrand ? (
                          <img
                            src={`https://logo.clearbit.com/${domain}?size=64`}
                            alt={sub.name}
                            className="brand-logo-img"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
                            }}
                          />
                        ) : (
                          <FallbackIcon size={22} color="#fff" />
                        )}
                      </div>
                      <div className="badge-connection-line"></div>
                    </div>

                    <div className="card-core-info">
                      <div className="card-title-row">
                        <h3 className="card-title">{sub.name}</h3>
                        <span className={`fync-status-pill ${sub.isActive ? 'active' : 'finalized'}`}>
                          {sub.isActive ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>
                      <div className="card-meta-row">
                        <span className="meta-tag">{sub.category || 'Serviço'}</span>
                        <span className="meta-separator">•</span>
                        <span className="meta-val">Vence dia {sub.billingDay}</span>
                        <span className="meta-separator">•</span>
                        <span className="meta-val">{sub.isActive ? 'Próximo débito em breve' : 'Assinatura inativa'}</span>
                      </div>
                    </div>

                    <div className="card-action-info" style={{ gap: '1rem' }}>
                      <div className="card-amount-total">
                        <span className="amount-label">Valor Mensal</span>
                        <span className="amount-value">{formatCurrency(sub.amount)}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-icon circle-btn"
                          title={sub.isActive ? 'Pausar' : 'Ativar'}
                          onClick={() => toggleSubscription(sub.id, !sub.isActive)}
                          style={{ background: sub.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}
                        >
                          {sub.isActive ? <Pause size={16} className="text-danger" /> : <Play size={16} className="text-success" />}
                        </button>
                        <button className="btn-icon circle-btn" onClick={() => {
                          setEditSubTarget(sub);
                          setEditSubName(sub.name);
                          setEditSubAmount(sub.amount.toString());
                          setEditSubCategory(sub.category || 'Lazer');
                          setEditSubBillingDay(sub.billingDay);
                          setIsEditSubModalOpen(true);
                        }}><Edit2 size={16} /></button>
                        <button className="btn-icon circle-btn" onClick={() => askConfirmation('Excluir Assinatura', 'Tem certeza que deseja remover esta assinatura definitivamente?', () => deleteSubscription(sub.id))}><Trash2 size={16} className="text-danger" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderCategories = () => {
    const targetMonthParts = (filterMonth || initialMonth).split('-');
    const currentMonthLabel = new Date(targetMonthParts[0], targetMonthParts[1] - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const categoryExpenses = CATEGORIES.map(cat => {
      const expenses = filteredTransactions.filter(t => t.type === 'expense' && t.category === cat.id);
      const total = expenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const limit = budgets ? (budgets[cat.id] || 0) : 0;
      return { ...cat, total, limit, expenses };
    }).filter(cat => cat.total > 0 || cat.limit > 0).sort((a, b) => b.total - a.total);

    const totalExpenseMonth = categoryExpenses.reduce((sum, cat) => sum + cat.total, 0);

    const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#14b8a6'];

    const pieData = categoryExpenses.map((c, i) => ({
      name: c.id,
      value: c.total,
      fill: COLORS[i % COLORS.length]
    }));

    return (
      <div className="animate-fade-in dashboard-categories-view">
        <div className="dashboard-header mb-6">
          <div>
            <h1 className="dashboard-title">Categorias e Orçamentos</h1>
            <p className="dashboard-subtitle">Acompanhe seus limites de gastos. Clique em uma categoria para ver os lançamentos.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => openNewTransaction('expense')}>
              <Plus size={18} /> Nova Transação
            </button>
          </div>
        </div>

        {/* Summary Header Card */}
        <div className="glass-panel" style={{
          padding: '2rem 2.5rem',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(23,25,35,0.6) 100%)'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 50%, rgba(99,102,241,0.07) 0%, transparent 60%)', zIndex: 0 }} />
          <div style={{ zIndex: 1 }}>
            <p className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Total gasto em {currentMonthLabel}</p>
            <h2 style={{ fontSize: '2.8rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
              {formatCurrency(totalExpenseMonth)}
            </h2>
          </div>
          <div style={{ width: '160px', height: '160px', zIndex: 1, position: 'relative' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none" cornerRadius={8}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ backgroundColor: '#171923', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted">Sem dados</div>
            )}
          </div>
        </div>

        {/* Categories List with Inline Drill-Down */}
        <div className="glass-panel" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted font-bold text-xs uppercase" style={{ letterSpacing: '1px' }}>CATEGORIAS</span>
            <span className="text-muted font-bold text-xs uppercase" style={{ letterSpacing: '1px' }}>GASTO</span>
          </div>

          {categoryExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted">Não há gastos registados para este mês.</div>
          ) : (
            categoryExpenses.map((cat, index) => {
              const isExpanded = expandedCat === cat.id;
              const color = COLORS[index % COLORS.length];
              const pct = cat.limit > 0 ? Math.min((cat.total / cat.limit) * 100, 100) : (totalExpenseMonth > 0 ? (cat.total / totalExpenseMonth) * 100 : 0);
              const isOverLimit = cat.limit > 0 && cat.total > cat.limit;
              const barColor = isOverLimit ? '#ef4444' : color;
              const catTxsSorted = [...cat.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

              return (
                <div key={cat.id} style={{ borderBottom: index < categoryExpenses.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  {/* Category Row - clickable header */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', padding: '1.1rem 1.5rem', cursor: 'pointer', transition: 'background 0.2s', background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                    onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  >
                    {/* Expand toggle */}
                    <div style={{ marginRight: '1rem', color: isExpanded ? color : 'var(--text-muted)', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      <ChevronDown size={18} />
                    </div>

                    {/* Category icon */}
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', flexShrink: 0 }}>
                      <cat.icon size={18} style={{ color }} />
                    </div>

                    {/* Name + count */}
                    <div style={{ flex: 1 }}>
                      <div className="font-bold" style={{ fontSize: '0.95rem' }}>{cat.id}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{catTxsSorted.length} lançamento{catTxsSorted.length !== 1 ? 's' : ''}</div>
                    </div>

                    {/* Progress bar inline */}
                    <div style={{ flex: 1, margin: '0 2rem' }}>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                      </div>
                      {cat.limit > 0 && (
                        <div style={{ fontSize: '0.7rem', color: isOverLimit ? '#ef4444' : 'var(--text-muted)', marginTop: '3px' }}>
                          {formatCurrency(cat.total)} / {formatCurrency(cat.limit)}
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="font-bold" style={{ fontSize: '1rem', color: isOverLimit ? '#ef4444' : 'var(--text-main)' }}>{formatCurrency(cat.total)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{totalExpenseMonth > 0 ? ((cat.total / totalExpenseMonth) * 100).toFixed(1) : 0}% do total</div>
                    </div>
                  </div>

                  {/* Expanded Transactions */}
                  {isExpanded && (
                    <div style={{ background: 'rgba(0,0,0,0.15)', borderTop: `2px solid ${color}30` }}>
                      {catTxsSorted.length === 0 ? (
                        <div style={{ padding: '1rem 2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhuma transação nesta categoria no período.</div>
                      ) : (
                        catTxsSorted.map((tx, tIdx) => {
                          const { icon: TxIcon, color: txIconColor, domain: txDomain, isBrand: txIsBrand } = getStoreIcon(tx.title);
                          const txWallet = wallets.find(w => w.id === tx.walletId);
                          const txDate = tx.date ? new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';
                          return (
                            <div
                              key={tx.id}
                              style={{
                                display: 'flex', alignItems: 'center', padding: '0.85rem 1.5rem 0.85rem 4rem',
                                borderBottom: tIdx < catTxsSorted.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                cursor: 'pointer',
                                transition: 'background 0.15s'
                              }}
                              onClick={() => openEditTransaction(tx)}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {/* TX icon */}
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: txIsBrand ? '#fff' : `${txIconColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', flexShrink: 0, overflow: 'hidden' }}>
                                {txIsBrand ? (
                                  <img src={`https://logo.clearbit.com/${txDomain}?size=32`} alt={tx.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.onerror = null; e.target.src = `https://www.google.com/s2/favicons?sz=64&domain=${txDomain}`; }} />
                                ) : (
                                  <TxIcon size={16} style={{ color: txIconColor }} />
                                )}
                              </div>

                              {/* Title + wallet */}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{tx.title}</div>
                                {txWallet && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{txWallet.name}</div>}
                              </div>

                              {/* Date */}
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '2rem' }}>{txDate}</div>

                              {/* Amount */}
                              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: tx.type === 'income' ? 'var(--success-color)' : 'var(--text-main)', flexShrink: 0 }}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Budget editing row */}
                      <div style={{ padding: '0.75rem 1.5rem 0.75rem 4rem', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>LIMITE DO ORÇAMENTO:</span>
                        {editingBudgetFor === cat.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="number" step="0.01" min="0"
                              value={budgetTempVal}
                              onChange={e => setBudgetTempVal(e.target.value)}
                              className="input-field"
                              style={{ width: '120px', padding: '4px 8px', fontSize: '0.85rem' }}
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') saveBudget(cat.id); if (e.key === 'Escape') setEditingBudgetFor(null); }}
                            />
                            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => saveBudget(cat.id)}>Salvar</button>
                            <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setEditingBudgetFor(null)}>Cancelar</button>
                          </div>
                        ) : (
                          <button
                            style={{ fontSize: '0.85rem', color: cat.limit > 0 ? color : 'var(--text-muted)', background: 'none', border: `1px dashed ${cat.limit > 0 ? color : 'rgba(255,255,255,0.1)'}`, borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); setEditingBudgetFor(cat.id); setBudgetTempVal(cat.limit ? String(cat.limit) : ''); }}
                          >
                            {cat.limit > 0 ? formatCurrency(cat.limit) : '+ Definir limite'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };


  const ACCENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

  const renderSettings = () => {
    const userName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0];
    const initialChar = userName?.charAt(0).toUpperCase();

    return (
      <div className="animate-fade-in">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Configurações</h1>
            <p className="dashboard-subtitle">Preferências do seu perfil e sistema.</p>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div className="user-avatar" style={{ width: 80, height: 80, fontSize: '2rem', background: accentColor }}>
                {initialChar}
              </div>
              <div>
                <h2 className="font-bold text-xl">{userName}</h2>
                <p className="text-muted">{currentUser?.email}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {ACCENT_COLORS.map(color => (
                    <div
                      key={color}
                      onClick={() => setAccentColor(color)}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', background: color,
                        cursor: 'pointer', border: accentColor === color ? '2px solid #fff' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="font-bold flex items-center gap-2"><User size={20} style={{ color: accentColor }} /> Informações Pessoais</h3>
                <div className="input-group">
                  <label className="input-label">Nome Completo</label>
                  <input
                    type="text" className="input-field"
                    value={settingsName}
                    onChange={e => setSettingsName(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">E-mail (Não pode ser alterado)</label>
                  <input
                    type="email" className="input-field"
                    value={currentUser?.email}
                    readOnly
                    style={{ background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                  />
                  <p className="text-xs text-muted mt-1">Por segurança, a alteração de e-mail é bloqueada.</p>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 className="font-bold flex items-center gap-2"><Shield size={20} className="text-success" /> Segurança</h3>
                <div className="input-group">
                  <label className="input-label">Nova Senha</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Mínimo 6 caracteres"
                    value={settingsNewPassword}
                    onChange={e => setSettingsNewPassword(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Confirmar Senha</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Repita a nova senha"
                    value={settingsConfirmPassword}
                    onChange={e => setSettingsConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h3 className="font-bold text-danger flex items-center gap-2 mb-2"><Trash2 size={18} /> Zona de Perigo</h3>
              <p className="text-sm text-muted mb-4">Ao excluir sua conta, todos os seus dados serão desconectados permanentemente.</p>
              <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)' }} onClick={handleDeleteAccountAction}>
                Excluir Minha Conta Permanentemente
              </button>
            </div>

            <div className="flex justify-end gap-4 mt-4">
              <button className="btn btn-secondary" onClick={() => setActiveTab('overview')}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateProfile}
                disabled={savingSettings}
                style={{ background: accentColor }}
              >
                {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Fync Dashboard <span className="text-primary font-bold">v{APP_VERSION}</span>
                </p>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
                  A Versão da Inteligência • 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- MOTOR INTELIGENTE DE NOTIFICAÇÕES ---
  const notifications = useMemo(() => {
    const list = [];

    // 1. Alerta de Orçamentos
    Object.keys(budgets).forEach(cat => {
      const limit = budgets[cat];
      if (limit > 0) {
        const spent = dynamicCategoryData.find(c => c.id === cat && c.type === 'expense')?.amount || 0;
        const ratio = spent / limit;
        if (ratio >= 0.9 && ratio < 1) {
          list.push({
            id: `budget_warn_${cat}`,
            type: 'warning',
            icon: <PieChart size={16} />,
            title: 'Atenção ao Orçamento!',
            desc: `Você usou ${(ratio * 100).toFixed(0)}% do limite de ${cat}.`,
            action: 'reports'
          });
        } else if (ratio >= 1) {
          list.push({
            id: `budget_crit_${cat}`,
            type: 'danger',
            icon: <PieChart size={16} />,
            title: 'Orçamento Estourado!',
            desc: `Você passou do limite de ${cat}.`,
            action: 'reports'
          });
        }
      }
    });

    // 2. Receitas Grandes
    const recentIncomes = filteredTransactions.filter(t => t.type === 'income' && t.amount >= 500);
    if (recentIncomes.length > 0) {
      list.push({
        id: `recent_income_${recentIncomes[0].id || '1'}`,
        type: 'success',
        icon: <Wallet size={16} />,
        title: 'Receita Significativa!',
        desc: `Entrada de ${formatCurrency(recentIncomes[0].amount)} computada.`,
        action: 'overview'
      });
    }

    // 3. Saldo Negativo
    if (filteredTotals.balance < 0) {
      list.push({
        id: 'negative_balance',
        type: 'danger',
        icon: <ArrowDownRight size={16} />,
        title: 'Saldo Negativo!',
        desc: `Atenção: seu saldo no período está negativo.`,
        action: 'overview'
      });
    }

    return list;
  }, [budgets, dynamicCategoryData, filteredTransactions, filteredTotals]);

  const activeNotifs = notifications.filter(n => !dismissedNotifs.includes(n.id));

  const handleNotifClick = (notif) => {
    setDismissedNotifs([...dismissedNotifs, notif.id]);
    setActiveTab(notif.action);
    setIsNotifOpen(false);
  };
  // ------------------------------------------

  return (
    <div className="dashboard-layout">
      {/* Top Search & Actions Header (Mockup Profile Section) */}
      <div className="top-right-actions">
        <div className="header-search" style={{ width: '240px' }}>
          <Search className="search-icon" size={16} />
          <input type="text" className="search-input" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '0.4rem 1rem 0.4rem 2.5rem', fontSize: '0.8rem' }} />
        </div>

        {/* User Profile Dropdown */}
        <div className="relative-container">
          <div className="profile-circle" onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}>
            <div className="user-avatar" style={{ background: accentColor, width: '100%', height: '100%', borderRadius: '0' }}>
              {(currentUser?.user_metadata?.name || currentUser?.email)?.charAt(0).toUpperCase()}
            </div>
          </div>

          {isProfileOpen && (
            <div className="header-dropdown glass-panel profile-dropdown" style={{ top: 'calc(100% + 15px)' }}>
              <div className="header-dropdown-item" onClick={() => { setActiveTab('settings'); setIsProfileOpen(false); }}>
                <User size={16} /> Meu Perfil
              </div>
              <div className="header-dropdown-item" onClick={logout}>
                <LogOut size={16} /> Sair
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="main-content" style={{ overflowY: 'auto' }}>
        <div className="interactive-layout-container">
          {/* Top Pill Navigation */}
          <div className="top-tabs-nav" style={{ marginTop: '2rem' }}>
            <button className={`tab-pill ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><LayoutDashboard size={16} /> Visão geral</button>
            <button className={`tab-pill ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}><Repeat size={16} /> Transações</button>
            <button className={`tab-pill ${activeTab === 'parcelamentos' ? 'active' : ''}`} onClick={() => setActiveTab('parcelamentos')}><CalendarDays size={16} /> Parcelamentos</button>
            <button className={`tab-pill ${activeTab === 'subscriptions' ? 'active' : ''}`} onClick={() => setActiveTab('subscriptions')}><RefreshCw size={16} /> Assinaturas</button>
            <button className={`tab-pill ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}><PieChart size={16} /> Categorias</button>
            <button className={`tab-pill ${activeTab === 'wallets' ? 'active' : ''}`} onClick={() => setActiveTab('wallets')}><CreditCard size={16} /> Carteiras</button>
            <button className={`tab-pill ${activeTab === 'investments' ? 'active' : ''}`} onClick={() => setActiveTab('investments')}><TrendingUp size={16} /> Investimentos</button>
            <button className={`tab-pill ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}><Activity size={16} /> Finn</button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' ? renderInteractiveOverview() : (
                <div style={{ padding: '0 2rem' }}>
                  {activeTab === 'transactions' && renderTransactions()}
                  {activeTab === 'parcelamentos' && renderInstallments()}
                  {activeTab === 'reports' && renderReports()}
                  {activeTab === 'investments' && renderInvestments()}
                  {activeTab === 'subscriptions' && renderSubscriptions()}
                  {activeTab === 'categories' && renderCategories()}
                  {activeTab === 'wallets' && renderWallets()}
                  {activeTab === 'settings' && renderSettings()}
                  {activeTab === 'ai' && <AiAssistant financialContext={aiFinancialContext} />}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Add/Edit Transaction Modal */}
      {isModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }} onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTransactionId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
              <button type="button" className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            <form
              onSubmit={handleAddTransaction}
              onKeyDown={(e) => { if (e.key === 'F2') { e.preventDefault(); handleAddTransaction(e); } }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >

              <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: 'var(--radius-lg)' }}>
                <button
                  type="button"
                  className={`btn flex-1`}
                  style={{ background: type === 'income' ? 'var(--success-color)' : 'transparent', color: type === 'income' ? '#fff' : 'var(--text-muted)', boxShadow: 'none' }}
                  onClick={() => setType('income')}
                >
                  Recebimento
                </button>
                <button
                  type="button"
                  className={`btn flex-1`}
                  style={{ background: type === 'expense' ? 'var(--danger-color)' : 'transparent', color: type === 'expense' ? '#fff' : 'var(--text-muted)', boxShadow: 'none' }}
                  onClick={() => setType('expense')}
                >
                  Pagamento
                </button>
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: '4px' }}>Data da Operação</label>
                <CustomDatePicker value={transactionDate} onChange={setTransactionDate} placeholder="Selecione a data" />
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: '4px' }}>Valor (R$)</label>
                <input
                  type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)} required
                  style={{ fontSize: '1.25rem', fontWeight: 'bold' }}
                />
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: '4px' }}>Qual Banco / Conta usou?</label>
                <select className="input-field" style={{ cursor: 'pointer' }} value={selectedWalletId} onChange={e => setSelectedWalletId(e.target.value)} required>
                  <option value="" disabled>Selecione uma conta</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.type === 'checking' ? 'Corrente' : 'Fatura'})</option>
                  ))}
                </select>
              </div>

              {category === 'Investimentos' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label" style={{ marginBottom: '4px' }}>Ticker (Código)</label>
                    <input type="text" className="input-field" placeholder="Ex: PETR4" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} required />
                  </div>
                  <div>
                    <label className="input-label" style={{ marginBottom: '4px' }}>{type === 'income' ? 'Evento (Ex: Dividendo)' : 'Ativo (Ex: Ação/FII)'}</label>
                    <input type="text" className="input-field" placeholder={type === 'income' ? "Pagamento de Juros" : "Compra de Cotas"} value={title} onChange={e => setTitle(e.target.value)} required />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="input-label" style={{ marginBottom: '4px' }}>Descrição / Memorando (Opcional)</label>
                  <textarea
                    className="input-field"
                    placeholder="Ex: Almoço com cliente, nota da nota fiscal..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
              )}

              <div>
                <label className="input-label" style={{ marginBottom: '4px' }}>
                  {category === 'Investimentos' ? 'Classificação do Ativo' : 'Classificar Categoria'}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {category === 'Investimentos' ? (
                    INVESTMENT_CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isSelected = subCategory === cat.id;
                      return (
                        <button
                          key={cat.id} type="button"
                          onClick={() => setSubCategory(cat.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem',
                            borderRadius: 'var(--radius-full)', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                            border: isSelected ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            color: isSelected ? 'var(--primary-color)' : 'var(--text-muted)'
                          }}
                        >
                          <Icon size={12} /> {cat.id}
                        </button>
                      )
                    })
                  ) : (
                    CATEGORIES.map(cat => {
                      if (cat.id === 'Investimentos') return null; // Remove Investimentos global para evitar loop mental do usuário
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id} type="button"
                          onClick={() => setCategory(cat.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem',
                            borderRadius: 'var(--radius-full)', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                            border: isSelected ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            color: isSelected ? 'var(--primary-color)' : 'var(--text-muted)'
                          }}
                        >
                          <Icon size={12} /> {cat.id}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem', marginTop: '1rem', fontWeight: 'bold' }}
              >
                {editingTransactionId ? 'Salvar Alterações (F2)' : (keepModalOpen ? 'Salvar e Continuar Lançando (F2)' : 'Concluir Lançamento (F2)')}
              </button>

              {!editingTransactionId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    id="keepOpen"
                    checked={keepModalOpen}
                    onChange={e => setKeepModalOpen(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                  />
                  <label htmlFor="keepOpen" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                    Modo Rápido: manter form aberto para próximo lançamento
                  </label>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {/* Transaction Detail Modal */}
      {isDetailModalOpen && selectedTransactionDetail && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }} onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content glass-panel animate-slide-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '2rem', border: '1px solid var(--primary-color)', boxShadow: '0 0 40px rgba(99, 102, 241, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.6rem', borderRadius: '12px', color: 'var(--primary-color)' }}>
                  <FileText size={20} />
                </div>
                <h2 className="font-bold text-lg">Detalhes do Lançamento</h2>
              </div>
              <button className="btn-icon" onClick={() => setIsDetailModalOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ textAlign: 'center', margin: '2rem 0' }}>
              <p className="text-muted text-sm mb-1">{selectedTransactionDetail.type === 'income' ? 'Valor Recebido' : 'Valor Pago'}</p>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: selectedTransactionDetail.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)',
                fontFamily: 'var(--font-display)'
              }}>
                {selectedTransactionDetail.type === 'income' ? '+' : '-'}{formatCurrency(selectedTransactionDetail.amount)}
              </h1>
              <div className="badge mt-2" style={{
                background: selectedTransactionDetail.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: selectedTransactionDetail.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)',
              }}>
                {selectedTransactionDetail.type === 'income' ? 'Receita' : 'Despesa'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span className="text-muted text-xs">Título:</span>
                <span className="font-medium text-main" style={{ lineHeight: '1.4' }}>{selectedTransactionDetail.title}</span>
              </div>

              {selectedTransactionDetail.description && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.75rem 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-muted text-xs">Descrição:</span>
                  <span className="text-main" style={{ fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{selectedTransactionDetail.description}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-muted">Data:</span>
                <span className="font-medium text-main">{new Date(selectedTransactionDetail.date).toLocaleDateString('pt-BR', { dateStyle: 'long' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Conta/Carteira:</span>
                <span className="font-medium text-main">{wallets.find(w => w.id === selectedTransactionDetail.walletId)?.name || 'Sem Carteira'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Categoria:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {(() => {
                    const iconObj = CATEGORIES.find(c => c.id === selectedTransactionDetail.category);
                    const Icon = iconObj ? iconObj.icon : ArrowUpRight;
                    return <Icon size={14} className="text-primary" />;
                  })()}
                  <span className="font-medium text-main">{selectedTransactionDetail.category}</span>
                </div>
              </div>
              {selectedTransactionDetail.ticker && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Ativo (Ticker):</span>
                  <span className="font-medium text-primary">{selectedTransactionDetail.ticker}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openEditTransaction(selectedTransactionDetail);
                }}
              >
                <Edit2 size={16} /> Editar
              </button>
              <button
                className="btn btn-secondary"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--danger-color)' }}
                onClick={() => {
                  setIsDetailModalOpen(false);
                  deleteTransaction(selectedTransactionDetail.id);
                }}
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Wallet Modal */}
      {isWalletModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }} onClick={() => setIsWalletModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingWalletId ? 'Editar Carteira Base' : 'Nova Carteira'}</h2>
              <button type="button" className="btn-icon" onClick={() => setIsWalletModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddWallet} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="input-label">Tipo de Conta</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className={`btn flex-1 ${walletType === 'checking' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWalletType('checking')}>Corrente</button>
                  <button type="button" className={`btn flex-1 ${walletType === 'credit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWalletType('credit')}>Cartão</button>
                </div>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Nome da Carteira/Banco</label>
                <input type="text" className="input-field" placeholder="Ex: Nubank, Itaú..." value={walletName} onChange={e => setWalletName(e.target.value)} required />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">
                  {walletType === 'credit' ? 'Limite do Cartão (R$)' : 'Saldo de Partida Inicial (R$)'}
                </label>
                <input type="number" step="0.01" className="input-field" placeholder="0.00" value={walletBalance} onChange={e => setWalletBalance(e.target.value)} required />
              </div>
              <p className="text-xs text-muted">A partir deste saldo inicial, todas as novas transações calcularão o estado de sua carteira dinamicamente.</p>
              <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }}>
                {editingWalletId ? 'Salvar Configuração' : 'Registrar Carteira'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OFX Preview Modal */}
      {ofxPreview && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }} onClick={() => setOfxPreview(null)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '750px', width: '90%', position: 'relative', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* Indicador de Carregamento da IA (Não-bloqueante) */}
            <AnimatePresence>
              {isAiCategorizing && (
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    background: 'linear-gradient(90deg, var(--primary-color), #818cf8)',
                    color: 'white', padding: '6px 1rem', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '0.5rem', zIndex: 100, fontSize: '0.75rem', fontWeight: 600
                  }}
                >
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles size={14} />
                  </motion.div>
                  O Finn está analisando seu extrato em segundo plano... ✨
                </motion.div>
              )}
            </AnimatePresence>

            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                  <UploadCloud size={20} className="text-primary" />
                </div>
                <h2>Extrato Inteligente 🤖</h2>
              </div>
              <button type="button" className="btn-icon" onClick={() => setOfxPreview(null)}><X size={24} /></button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                padding: '1rem',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: '#6366f1', padding: '0.5rem', borderRadius: '10px' }}>
                    <Wallet size={18} />
                  </div>
                  <div>
                    <label className="input-label" style={{ margin: 0, fontSize: '0.75rem' }}>Importar para qual conta?</label>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Selecione o destino</div>
                  </div>
                </div>
                <select
                  className="input-field"
                  value={ofxPreview.walletId}
                  onChange={e => setOfxPreview({ ...ofxPreview, walletId: e.target.value })}
                  style={{ background: '#1a1c2e', width: 'auto', minWidth: '200px', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="">Selecione...</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.type === 'credit' ? 'Cartão' : 'Corrente'})</option>
                  ))}
                </select>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: isAiAutoCategorizeEnabled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: `1px solid ${isAiAutoCategorizeEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id="ai-auto-toggle"
                    checked={isAiAutoCategorizeEnabled}
                    onChange={(e) => setIsAiAutoCategorizeEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
                  />
                </div>
                <label htmlFor="ai-auto-toggle" style={{ fontSize: '0.85rem', cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, color: isAiAutoCategorizeEnabled ? 'var(--primary-color)' : 'var(--text-main)' }}>Categorização Automática (IA)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O Finn tentará identificar categorias para transações marcadas como "Outros"</span>
                </label>
                {isAiCategorizing && (
                  <div className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600 }}>
                    <Sparkles size={12} /> Analisando...
                  </div>
                )}
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#161625', position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Data</th>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Descrição</th>
                      <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Categoria (✨ IA)</th>
                      <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ofxPreview.items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={item.title}>
                            {item.title}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <select
                              style={{
                                background: item.isAiSuggested ? 'rgba(99,102,241,0.1)' : '#1a1c2e',
                                border: item.isAiSuggested ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                fontSize: '0.8rem',
                                borderRadius: '8px',
                                padding: '4px 24px 4px 8px',
                                cursor: 'pointer',
                                width: '100%',
                                appearance: 'none'
                              }}
                              value={item.category}
                              onChange={(e) => {
                                const newItems = [...ofxPreview.items];
                                newItems[idx].category = e.target.value;
                                newItems[idx].isAiSuggested = false; // Usuário alterou
                                setOfxPreview({ ...ofxPreview, items: newItems });
                              }}
                            >
                              {CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.id}</option>
                              ))}
                            </select>
                            {item.isAiSuggested && (
                              <span style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#818cf8', fontSize: '0.65rem' }}>✨</span>
                            )}
                            <ChevronDown size={14} style={{ position: 'absolute', right: item.isAiSuggested ? '22px' : '8px', pointerEvents: 'none', opacity: 0.5 }} />
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: item.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 'bold' }}>
                          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setOfxPreview(null)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={confirmOFXImport}
                  disabled={loading || !ofxPreview.walletId}
                  style={{ fontWeight: 'bold' }}
                >
                  {loading ? 'Processando...' : `Confirmar Importação (${ofxPreview.items.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {isSubModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }} onClick={() => setIsSubModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2" style={{ fontWeight: 'bold' }}><Repeat size={20} className="text-primary" /> Nova Assinatura</h2>
              <button type="button" className="btn-icon" onClick={() => setIsSubModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddSubscription} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Nome do Serviço (Ex: Netflix, Internet)</label>
                <input type="text" className="input-field" value={subName} onChange={e => setSubName(e.target.value)} required />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Valor Mensal (R$)</label>
                <input type="number" step="0.01" className="input-field" placeholder="0.00" value={subAmount} onChange={e => setSubAmount(e.target.value)} required />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Categoria</label>
                <select className="input-field" value={subFormCategory} onChange={e => setSubFormCategory(e.target.value)} required>
                  {CATEGORIES.filter(c => c.id !== 'Investimentos').map(c => (
                    <option key={c.id} value={c.id}>{c.id}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Dia do Vencimento Todo Mês</label>
                <input type="number" min="1" max="31" className="input-field" value={subBillingDay} onChange={e => setSubBillingDay(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Assinatura'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {isEditSubModalOpen && editSubTarget && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }} onClick={() => !loading && setIsEditSubModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2" style={{ fontWeight: 'bold' }}><Edit2 size={20} className="text-primary" /> Editar Assinatura</h2>
              <button type="button" className="btn-icon" onClick={() => !loading && setIsEditSubModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              const res = await updateSubscription(editSubTarget.id, {
                name: editSubName,
                amount: parseFloat(editSubAmount),
                category: editSubCategory,
                billingDay: parseInt(editSubBillingDay, 10),
              });
              if (res?.success !== false) {
                showToast('Assinatura atualizada com sucesso!');
                setIsEditSubModalOpen(false);
              } else {
                showToast('Erro ao atualizar: ' + (res.message || 'Erro desconhecido'), 'error');
              }
              setLoading(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Nome do Serviço</label>
                <input type="text" className="input-field" value={editSubName} onChange={e => setEditSubName(e.target.value)} required />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Valor Mensal (R$)</label>
                <input type="number" step="0.01" className="input-field" placeholder="0.00" value={editSubAmount} onChange={e => setEditSubAmount(e.target.value)} required />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Categoria</label>
                <select className="input-field" value={editSubCategory} onChange={e => setEditSubCategory(e.target.value)} required>
                  {CATEGORIES.filter(c => c.id !== 'Investimentos').map(c => (
                    <option key={c.id} value={c.id}>{c.id}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Dia do Vencimento Todo Mês</label>
                <input type="number" min="1" max="31" className="input-field" value={editSubBillingDay} onChange={e => setEditSubBillingDay(e.target.value)} required />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsEditSubModalOpen(false)} disabled={loading}>Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }} onClick={() => setIsGoalModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2" style={{ fontWeight: 'bold' }}><Target size={20} className="text-primary" /> Nova Meta de Economia</h2>
              <button type="button" className="btn-icon" onClick={() => setIsGoalModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Qual o seu objetivo? (Ex: Viagem, Carro)</label>
                <input type="text" className="input-field" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} required />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Valor Alvo do Objetivo (R$)</label>
                <input type="number" step="0.01" className="input-field" placeholder="10000.00" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} required />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Mês Limite / Prazo (Opcional)</label>
                <input type="date" className="input-field" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Cor Tonal da Meta</label>
                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  {ACCENT_COLORS.map(color => (
                    <div
                      key={color}
                      onClick={() => setGoalColor(color)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: color,
                        cursor: 'pointer', border: goalColor === color ? '3px solid #fff' : 'none',
                        boxShadow: goalColor === color ? `0 0 10px ${color}` : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Meta de Economia'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Goal Progress Interactive Modal */}
      {isGoalProgressModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }} onClick={() => !loading && setIsGoalProgressModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2" style={{ fontWeight: 'bold' }}>
                <TrendingUp size={20} className="text-primary" /> Adicionar Progresso
              </h2>
              <button type="button" className="btn-icon" onClick={() => !loading && setIsGoalProgressModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <p className="text-muted text-sm mb-4">Reserva para: <strong>{goalProgressTarget?.title}</strong></p>

            <form onSubmit={handleAddGoalProgress} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Quanto deseja guardar? (R$)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>R$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                    value={goalProgressAmount}
                    onChange={e => setGoalProgressAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Sair de qual carteira? (Opcional)</label>
                <select
                  className="input-field"
                  value={goalProgressWalletId}
                  onChange={e => setGoalProgressWalletId(e.target.value)}
                >
                  <option value="">Nenhuma (Apenas registrar Aporte solto)</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-2">Isso será registrado como uma Despesa (Investimento) no seu fluxo de caixa.</p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setIsGoalProgressModalOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? 'Processando...' : 'Confirmar Aporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Adjustment Interactive Modal */}
      {isAssetAdjustmentModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }} onClick={() => !loading && setIsAssetAdjustmentModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2" style={{ fontWeight: 'bold' }}>
                <Edit2 size={20} className="text-primary" /> Ajustar Ativo
              </h2>
              <button type="button" className="btn-icon" onClick={() => !loading && setIsAssetAdjustmentModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <p className="text-muted text-sm mb-4">Ajustando posição de: <strong>{assetAdjustTarget?.ticker}</strong></p>

            <form onSubmit={handleAssetAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Qtd. Real de Cotas</label>
                  <input
                    type="number"
                    min="0"
                    value={assetAdjustQty}
                    onChange={e => setAssetAdjustQty(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Preço Médio Real (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={assetAdjustAvgPrice}
                    onChange={e => setAssetAdjustAvgPrice(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)' }}>
                <p className="text-xs text-muted" style={{ lineHeight: '1.4' }}>
                  <strong>Como funciona:</strong> O Fync lançará um "Ajuste Contábil" automático para corrigir a matemática importada da B3 conforme os valores informados acima.
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-secondary flex-1"
                  onClick={() => setIsAssetAdjustmentModalOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                  {loading ? 'Ajustando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal Custom */}
      {confirmState.isOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 11000 }} onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }} onClick={e => e.stopPropagation()}>
            <div style={{
              background: confirmState.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
              width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
              color: confirmState.type === 'danger' ? 'var(--danger-color)' : 'var(--primary-color)'
            }}>
              <X size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">{confirmState.title}</h2>
            <p className="text-muted mb-8">{confirmState.message}</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-secondary flex-1"
                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
              >
                Cancelar
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  background: confirmState.type === 'danger' ? 'var(--danger-color)' : 'var(--primary-color)',
                  color: 'white'
                }}
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }} onClick={() => setIsTransferModalOpen(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2" style={{ fontWeight: 'bold' }}>
                <ArrowRightLeft size={20} className="text-primary" /> Nova Transferência
              </h2>
              <button type="button" className="btn-icon" onClick={() => setIsTransferModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <p className="text-muted text-sm mb-4">Transfira saldo rapidamente entre suas contas correntes e carteiras cadastradas.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">De (Origem)</label>
                <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)} className="input-field">
                  <option value="">Selecione a carteira de origem...</option>
                  {wallets.map(w => (
                    <option key={`from-${w.id}`} value={w.id}>{w.name} ({formatCurrency(w.dynamicBalance)})</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Para (Destino)</label>
                <select value={transferTo} onChange={e => setTransferTo(e.target.value)} className="input-field">
                  <option value="">Selecione a carteira de destino...</option>
                  {wallets.map(w => (
                    <option key={`to-${w.id}`} value={w.id}>{w.name} ({formatCurrency(w.dynamicBalance)})</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Valor da Transferência (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="input-field"
                  placeholder="Ex: 150,00"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn btn-secondary flex-1" onClick={() => setIsTransferModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary flex-1" onClick={handleTransfer} disabled={!transferFrom || !transferTo || !transferAmount}>
                  Transferir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
              {toast.type === 'success' ? <TrendingUp size={18} /> : toast.type === 'error' ? <X size={18} /> : <Bell size={18} />}
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Floating Finn AI Assistant */}
      <div className="floating-ai-wrapper">
        <AnimatePresence>
          {isAiFloatingOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="floating-ai-window glass-panel"
            >
              <div className="floating-ai-header">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <span className="font-bold">Chat com o Finn</span>
                </div>
                <button className="btn-icon" onClick={() => setIsAiFloatingOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="floating-ai-content">
                <AiAssistant financialContext={aiFinancialContext} compactMode={true} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`floating-ai-trigger ${isAiFloatingOpen ? 'active' : ''}`}
          onClick={() => setIsAiFloatingOpen(!isAiFloatingOpen)}
        >
          <div className="trigger-icon-wrapper">
            <img src="/finn-icon.png" alt="Finn" className="finn-bubble-img" />
            <div className="pulse-ring"></div>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
