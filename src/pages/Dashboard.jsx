import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFinance } from '../contexts/FinanceContext';
import CustomDatePicker from '../components/CustomDatePicker';
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
  HelpCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { parseOFX } from '../utils/ofxParser';
import './Dashboard.css';

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

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const { transactions, totals, addTransaction, updateTransaction, deleteTransaction, deleteTransactions, bulkUpdateCategory, wallets, addWallet, updateWallet, deleteWallet, budgets, updateBudget } = useFinance();
  const [activeTab, setActiveTab] = useState('overview');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // OFX Import state
  const [ofxPreview, setOfxPreview] = useState(null); // { transactions: [...] } or null

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Month & Period Filtering State
  const currentDate = new Date();
  const initialMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  const [filterMode, setFilterMode] = useState('month'); 
  const [filterMonth, setFilterMonth] = useState(initialMonth);
  const [filterStartDate, setFilterStartDate] = useState(currentDate.toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState(currentDate.toISOString().split('T')[0]);
  
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const monthPickerRef = useRef(null);

  // Settings State
  const [settingsName, setSettingsName] = useState(currentUser?.user_metadata?.name || '');
  const [accentColor, setAccentColor] = useState('#6366f1'); // Default Indigo
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });

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

  // Wallet State
  const [editingWalletId, setEditingWalletId] = useState(null);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('checking');
  const [walletBalance, setWalletBalance] = useState('');

  // Budgets State
  const [editingBudgetFor, setEditingBudgetFor] = useState(null);
  const [budgetTempVal, setBudgetTempVal] = useState('');
  const fileInputRef = useRef(null);

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
      r = Math.pow(1 + r, 1/12) - 1;
    } else if (fiRatePeriod === 'semesterly') {
      r = Math.pow(1 + r, 1/6) - 1;
    }

    if (fiTimePeriod === 'years') {
      n = n * 12;
    } else if (fiTimePeriod === 'semesters') {
      n = n * 6;
    }

    if(r === 0) return p + (pmt * n);
    
    const amountP = p * Math.pow(1 + r, n);
    const amountPmt = pmt * ((Math.pow(1 + r, n) - 1) / r);
    return amountP + amountPmt;
  }, [fiInitial, fiMonthly, fiRate, fiMonths, fiRatePeriod, fiTimePeriod]);

  // Filtering Data
  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter(t => {
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
  }, [transactions, filterMonth, filterMode, filterStartDate, filterEndDate]);

  const memoizedSortedTransactions = useMemo(() => {
    try {
      return [...filteredTransactions].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
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
      console.log('[OFX] First 300 chars:', content.substring(0, 300));
      const extracted = parseOFX(content);
      console.log('[OFX] Parsed transactions:', extracted.length);
      if (extracted.length === 0) {
        alert('Nenhuma transação encontrada.\n\nVerifique se o arquivo é um extrato .OFX válido do seu banco.');
        return;
      }
      setOfxPreview({ 
        items: extracted.map(item => ({ ...item, category: 'Outros' })), 
        walletId: wallets.length > 0 ? wallets[0].id : '' 
      });
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

  const confirmOFXImport = async () => {
    if (!ofxPreview) return;
    const items = ofxPreview.items;
    const wId = ofxPreview.walletId;
    for (const tx of items) {
      await addTransaction({ ...tx, walletId: wId });
    }
    setOfxPreview(null);
    alert(`✅ ${items.length} transações importadas com sucesso!`);
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

  const exportToExcel = () => {
    if (transactions.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(transactions.map(t => {
      const walletName = wallets.find(w => w.id === t.walletId)?.name || 'Sem Carteira';
      return {
        Data: new Date(t.date).toLocaleDateString('pt-BR'),
        Título: t.title,
        Categoria: t.category,
        Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
        Carteira: walletName,
        Valor: t.amount
      }
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, "fync_historico.xlsx");
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

  const renderOverview = () => (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Visão Geral</h1>
          <p className="dashboard-subtitle">Acompanhamento: <span className="text-primary font-medium">{getDisplaySubtitle()}</span></p>
        </div>
        <button className="btn btn-primary" onClick={() => openNewTransaction('expense', 'Alimentação')}>
          <Plus size={18} />
          Nova Transação
        </button>
      </div>
      {renderInteractiveSelector()}
      <div className="stats-grid" style={{ animationDelay: '0.1s', position: 'relative', zIndex: 1 }}>
        <div className="stat-card glass-panel">
          <div className="stat-header">
            <span className="stat-title">Saldo no Período</span>
            <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)' }}>
              <Wallet size={20} />
            </div>
          </div>
          <div className="stat-value">{formatCurrency(filteredTotals.balance)}</div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-header">
            <span className="stat-title text-success">Receitas</span>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="stat-value text-success">{formatCurrency(filteredTotals.income)}</div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-header">
            <span className="stat-title text-danger">Despesas</span>
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="stat-value text-danger">{formatCurrency(filteredTotals.expense)}</div>
        </div>
      </div>

      {Object.keys(budgets).some(catId => {
        const limit = budgets[catId] || 0;
        const used = dynamicCategoryData.find(d => d.name === catId)?.value || 0;
        return limit > 0 && (used / limit) >= 0.8;
      }) && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger-color)', marginBottom: '0.5rem' }}>
            <Bell size={20} />
            <span className="font-bold">Atenção: Limite de Orçamento</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {Object.keys(budgets).map(catId => {
              const limit = budgets[catId] || 0;
              const used = dynamicCategoryData.find(d => d.name === catId)?.value || 0;
              const progress = limit > 0 ? (used / limit) * 100 : 0;
              if (limit === 0 || progress < 80) return null;
              
              return (
                <div key={catId} style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="font-medium text-main">{catId}:</span>
                  <span style={{ color: progress >= 100 ? 'var(--danger-color)' : '#f59e0b', fontWeight: 'bold' }}>
                    {progress >= 100 ? 'Estourado!' : `${progress.toFixed(0)}% usado`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="charts-section" style={{ animationDelay: '0.2s', marginTop: '2rem', position: 'relative', zIndex: 1 }}>
        <div className="chart-card glass-panel">
          <h2 className="chart-title">Fluxo de Caixa</h2>
          <div style={{ width: '100%', height: 300 }}>
            {dynamicFlowData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted">Sem dados no período para montar o gráfico.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicFlowData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272a37" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} tickFormatter={(value) => `R$${value}`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#171923', borderColor: '#272a37', color: '#f8fafc' }} />
                  <Area type="monotone" dataKey="Receitas" stroke="#10b981" fillOpacity={1} fill="url(#colorUv)" />
                  <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorPv)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="transactions-section glass-panel">
          <div className="transactions-header">
            <h2>Lançamentos Recentes ({filteredTransactions.length})</h2>
          </div>
          <div className="transaction-list" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {filteredTransactions.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '2rem 0' }}>
                Nenhuma transação encontrada no período.
              </div>
            ) : (
              filteredTransactions.slice(0, 15).map(t => {
                const tDateStr = t && t.date ? String(t.date) : '';
                const isoDatePart = tDateStr.includes('T') ? tDateStr.split('T')[0] : tDateStr;
                const dateParts = isoDatePart.split('-');
                const y = dateParts[0] || '';
                const m = dateParts[1] || '';
                const d = dateParts[2] || '';
                const wName = wallets.find(w => w.id === t.walletId)?.name || 'N/A';
                
                return (
                  <div key={t.id} className="transaction-item">
                    <div className="transaction-info">
                      <div className="transaction-icon" style={{ 
                        background: t.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: t.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)'
                      }}>
                        {t.type === 'income' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                      </div>
                      <div className="transaction-details">
                        <span className="transaction-title">{t.title}</span>
                        <span className="transaction-date">
                          {d && m && y ? (
                             <strong style={{ color: 'var(--text-main)' }}>{`${d}/${m}/${y}`}</strong> 
                          ) : (
                             <strong style={{ color: 'var(--text-main)' }}>Sem Data</strong>
                          )}
                          {' '}• {t.category} ({wName})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`transaction-amount ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`} style={{ marginRight: '1rem' }}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      <button className="btn-icon" onClick={() => openEditTransaction(t)} title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => deleteTransaction(t.id)} title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const PIE_COLORS = ['#6366f1', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#84cc16'];
  const pieData = [
    { name: 'Receitas', value: filteredTotals.income },
    { name: 'Despesas', value: filteredTotals.expense }
  ];

  const renderReports = () => (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Relatórios Detalhados</h1>
          <p className="dashboard-subtitle">Análise Financeira Completa e Leitura OFX.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".ofx" style={{ display: 'none' }} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
            <UploadCloud size={18} /> OFX
          </button>
          <button className="btn btn-secondary" onClick={exportToPDF}>
            <FileDown size={18} className="text-danger" /> PDF
          </button>
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <FileDown size={18} className="text-success" /> Excel
          </button>
        </div>
      </div>
      
      {renderInteractiveSelector()}

      <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
        <h2 className="chart-title mb-4" style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <Activity size={20} style={{ color: 'var(--primary-color)' }} />
          Orçamento Mensal — Travas de Gastos
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {CATEGORIES.map(cat => {
            if (cat.id === 'Investimentos' || cat.id === 'Outros') return null;
            const limit = budgets[cat.id] || 0;
            const usedRaw = dynamicCategoryData.find(d => d.name === cat.id)?.value || 0;
            const progress = limit > 0 ? (usedRaw / limit) * 100 : 0;
            const isEditing = editingBudgetFor === cat.id;
            const isOver = limit > 0 && progress >= 100;
            const isWarning = limit > 0 && progress >= 80 && progress < 100;

            return (
              <div key={cat.id} style={{
                background: isOver ? 'rgba(239, 68, 68, 0.07)' : 'rgba(255,255,255,0.03)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: isOver ? '1px solid rgba(239,68,68,0.4)' : isWarning ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border 0.3s'
              }}>
                {isOver && <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--danger-color)', borderRadius: '4px 0 0 4px' }} />}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingLeft: isOver ? '8px' : '0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    <cat.icon size={15} style={{ color: isOver ? 'var(--danger-color)' : 'var(--primary-color)' }} />
                    {cat.id}
                  </span>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>R$</span>
                      <input
                        type="number"
                        autoFocus
                        value={budgetTempVal}
                        onChange={e => setBudgetTempVal(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') saveBudget(cat.id); if(e.key === 'Escape') setEditingBudgetFor(null); }}
                        style={{
                          width: '90px', padding: '0.2rem 0.5rem',
                          background: 'rgba(99,102,241,0.15)',
                          border: '1px solid var(--primary-color)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-main)',
                          outline: 'none',
                          fontSize: '0.875rem'
                        }}
                        placeholder="0,00"
                      />
                      <button
                        onClick={() => saveBudget(cat.id)}
                        style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >OK</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingBudgetFor(cat.id); setBudgetTempVal(String(limit || '')); }}
                      style={{
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 'var(--radius-full)',
                        color: 'var(--primary-color)',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.6rem',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {limit > 0 ? `Teto: ${formatCurrency(limit)}` : '+ Definir Meta'}
                    </button>
                  )}
                </div>

                {limit > 0 ? (
                  <div style={{ paddingLeft: isOver ? '8px' : '0' }}>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(progress, 100)}%`,
                        background: isOver ? 'var(--danger-color)' : isWarning ? '#f59e0b' : 'var(--success-color)',
                        borderRadius: '3px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>Gasto: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(usedRaw)}</strong></span>
                      <span style={{ color: isOver ? 'var(--danger-color)' : isWarning ? '#f59e0b' : 'var(--success-color)', fontWeight: 600 }}>
                        {isOver ? `⚠ Estourado (+${formatCurrency(usedRaw - limit)})` : `${(100 - progress).toFixed(0)}% livre`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Sem limite definido para este mês
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h2 className="chart-title mb-4">Proporção Receitas x Despesas</h2>
          <div style={{ width: '100%', height: 300 }}>
            {filteredTotals.income === 0 && filteredTotals.expense === 0 ? (
               <div className="flex h-full items-center justify-center text-muted">Sem dados disponíveis.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell key="cell-0" fill="#10b981" />
                    <Cell key="cell-1" fill="#ef4444" />
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#171923', borderColor: '#272a37', color: '#f8fafc' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h2 className="chart-title mb-4">Despesas por Categoria</h2>
          {dynamicCategoryData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted">Sem despesas registradas.</div>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicCategoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#272a37" horizontal={false} />
                  <XAxis stroke="#94a3b8" type="number" tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="name" stroke="#94a3b8" type="category" width={80} />
                  <RechartsTooltip cursor={{ fill: '#1e202d' }} contentStyle={{ backgroundColor: '#171923', borderColor: '#272a37' }} />
                  <Bar dataKey="value" name="Valor Gasto" fill="var(--primary-color)" radius={[0, 4, 4, 0]}>
                    {dynamicCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h2 className="chart-title mb-4">Aportes por Classe (Investimentos)</h2>
          {investmentAportesData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted">Sem aportes no período.</div>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={investmentAportesData}
                    cx="50%" cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {investmentAportesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: '#171923', borderColor: '#272a37', color: '#f8fafc' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h2 className="chart-title mb-4">Proventos Recebidos (Por Ativo)</h2>
          {investmentDividendosData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted">Sem dividendos no período.</div>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={investmentDividendosData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#272a37" horizontal={false} />
                  <XAxis stroke="#94a3b8" type="number" tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="name" stroke="#94a3b8" type="category" width={80} />
                  <RechartsTooltip cursor={{ fill: '#1e202d' }} contentStyle={{ backgroundColor: '#171923', borderColor: '#272a37' }} />
                  <Bar dataKey="value" name="Dividendos" fill="var(--success-color)" radius={[0, 4, 4, 0]}>
                    {investmentDividendosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 3) % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
        <h2 className="chart-title mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Histórico Completo de Lançamentos</span>
            
            <button 
              className={`btn ${isSelectionMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={toggleSelectionMode}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <Shield size={14} style={{ marginRight: '0.5rem' }} />
              {isSelectionMode ? 'Sair da Seleção' : 'Selecionar Lançamentos'}
            </button>

            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select 
                  className="input-field"
                  onChange={(e) => handleBulkUpdateCategory(e.target.value)}
                  defaultValue=""
                  style={{ 
                    padding: '0.4rem 0.8rem', 
                    fontSize: '0.8rem', 
                    width: 'auto',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--primary-color)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled>📁 Categorizar selecionados...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.id}</option>
                  ))}
                </select>

                <button 
                  className="btn btn-secondary animate-fade-in" 
                  onClick={handleBulkDelete}
                  disabled={loading}
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.1)', 
                    color: 'var(--danger-color)', 
                    borderColor: 'rgba(239, 68, 68, 0.3)', 
                    padding: '0.4rem 0.8rem', 
                    fontSize: '0.8rem',
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Trash2 size={14} style={{ marginRight: '0.5rem' }} />
                  {loading ? 'Excluindo...' : `Excluir ${selectedIds.length}`}
                </button>
              </div>
            )}
          </div>
          <span className="text-muted text-sm">{transactions.length} Registros</span>
        </h2>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                {isSelectionMode && (
                  <th style={{ padding: '1rem', width: '140px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length > 0 && selectedIds.length === transactions.length}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectAll(transactions);
                        }}
                      />
                      Selecionar todos
                    </label>
                  </th>
                )}
                <th style={{ padding: '1rem', fontWeight: 600 }}>Data</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Título</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Conta/Cartão</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Categoria</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Tipo</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Valor</th>
                {!isSelectionMode && <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(() => {
                try {
                  return memoizedSortedTransactions.map(t => {
                    const wName = wallets.find(w => w.id === t.walletId)?.name || 'Sem Carteira';
                    const isSelected = selectedIds.includes(t.id);
                    return (
                      <tr 
                        key={t.id} 
                        onClick={(e) => {
                          try {
                            if (isSelectionMode) {
                              handleToggleSelect(t.id);
                            } else {
                              setSelectedTransactionDetail(t);
                              setIsDetailModalOpen(true);
                            }
                          } catch (err) {
                            console.error('Row click error:', err);
                          }
                        }}
                        style={{ 
                          borderBottom: '1px solid var(--border-color)', 
                          background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                          transition: 'background 0.2s',
                          cursor: 'pointer'
                        }}
                      >
                        {isSelectionMode && (
                          <td style={{ padding: '1rem' }}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleSelect(t.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                        )}
                        <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                          {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : 'Sem Data'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 500 }}>{t.title}</div>
                          {t.ticker && <span className="text-xs text-primary">{t.ticker}</span>}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{wName}</td>
                        <td style={{ padding: '1rem' }}>
                          <select 
                            value={t.category}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateTransaction(t.id, { ...t, category: e.target.value });
                              showToast(`✅ Categoria de "${t.title}" alterada para "${e.target.value}".`);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              fontSize: '0.875rem',
                              padding: '0.2rem',
                              cursor: 'pointer',
                              outline: 'none',
                              borderRadius: '4px',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.id}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', 
                            background: t.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: t.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)',
                            fontSize: '0.8rem', fontWeight: 'bold'
                          }}>
                            {t.type === 'income' ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: t.type==='income'?'var(--success-color)':'var(--danger-color)', fontWeight:'bold' }}>
                          {formatCurrency(t.amount)}
                        </td>
                        {!isSelectionMode && (
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); openEditTransaction(t); }} title="Editar">
                                <Edit2 size={16} />
                              </button>
                              <button className="btn-icon" onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }} title="Excluir">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  });
                } catch (err) {
                  console.error('Render table error:', err);
                  return null;
                }
              })()}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma transação salva no sistema.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInvestments = () => {
    const investmentTxs = transactions.filter(t => t.category === 'Investimentos');

    // Portfolio Consolidation Logic
    const portfolio = investmentTxs.reduce((acc, t) => {
      if (!t.ticker) return acc;
      if (!acc[t.ticker]) acc[t.ticker] = { ticker: t.ticker, quantity: 0, totalInvested: 0, dividends: 0, category: t.category };
      
      if (t.type === 'expense') { // Purchase
        // Assuming amount is total cost and we need quantity from title "Compra X PETR4" or similar
        // For now, let's look for quantity in a memo if we had one, but we don't.
        // I'll assume standard purchase log: amount = price * quantity.
        // Since I don't have a 'quantity' field yet, I'll use a mocked calculation or look for it in title.
        const qtyMatch = t.title.match(/(\d+)\s+cotas/i) || t.title.match(/(\d+)\s+units/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1; 
        acc[t.ticker].quantity += qty;
        acc[t.ticker].totalInvested += t.amount;
      } else { // Dividend / JCP
        acc[t.ticker].dividends += t.amount;
      }
      return acc;
    }, {});

    const portfolioList = Object.values(portfolio).filter(p => p.quantity > 0 || p.dividends > 0);
    const totalInvestedPortfolio = portfolioList.reduce((sum, p) => sum + p.totalInvested, 0);
    const totalDividendsAccumulated = portfolioList.reduce((sum, p) => sum + p.dividends, 0);
    const yieldOnCost = totalInvestedPortfolio > 0 ? (totalDividendsAccumulated / totalInvestedPortfolio) * 100 : 0;

    // Data for Allocation Chart
    const allocationData = INVESTMENT_CATEGORIES.map(cat => {
      const value = investmentTxs
        .filter(t => t.title.toLowerCase().includes(cat.id.toLowerCase()) || t.category === cat.id)
        .reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0);
      return { name: cat.id, value };
    }).filter(d => d.value > 0);

    return (
      <div className="animate-fade-in">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Gestão de Investimentos</h1>
            <p className="dashboard-subtitle">Lançamentos centralizados, ativos e cálculos projetivos.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" style={{ background: 'var(--success-light)', color: 'var(--success-color)' }} onClick={() => {
              openNewTransaction('income', 'Investimentos');
              setTitle('Recebimento de Dividendos/JCP');
            }}>
              <Plus size={18} /> Lançar Dividendo
            </button>
            <button className="btn" style={{ background: 'var(--danger-light)', color: 'var(--danger-color)' }} onClick={() => {
              openNewTransaction('expense', 'Investimentos');
              setTitle('Compra de Ações / FIIs');
            }}>
              <Plus size={18} /> Comprar Ativo
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="stat-card glass-panel">
            <div className="stat-header">
              <span className="stat-title flex items-center gap-1">
                Patrimônio Alocado
                <span className="tooltip-container">
                  <HelpCircle size={14} className="tooltip-icon" />
                  <span className="tooltip-balloon">Custo total de aquisição de todos os ativos ainda em carteira.</span>
                </span>
              </span>
              <TrendingUp size={16} className="text-primary" />
            </div>
            <div className="stat-value">{formatCurrency(totalInvestedPortfolio)}</div>
            <div className="text-xs text-muted mt-1">Custo de Aquisição</div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-header">
              <span className="stat-title flex items-center gap-1">
                Dividendos Acumulados
                <span className="tooltip-container">
                  <HelpCircle size={14} className="tooltip-icon" />
                  <span className="tooltip-balloon">Soma total de todos os Dividendos, JCP e Rendimentos recebidos desse portfolio.</span>
                </span>
              </span>
              <ArrowUpRight size={16} className="text-success" />
            </div>
            <div className="stat-value text-success">{formatCurrency(totalDividendsAccumulated)}</div>
            <div className="text-xs text-muted mt-1">Total recebido</div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-header">
              <span className="stat-title flex items-center gap-1">
                Yield on Cost (YoC)
                <span className="tooltip-container">
                  <HelpCircle size={14} className="tooltip-icon" />
                  <span className="tooltip-balloon">Rendimento anualizado baseado no preço médio que você pagou. (Dividendos Totais / Custo de Aquisição * 100)</span>
                </span>
              </span>
              <Activity size={16} className="text-warning" />
            </div>
            <div className="stat-value text-warning">{yieldOnCost.toFixed(2)}%</div>
            <div className="text-xs text-muted mt-1">Rendimento sobre investimento</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Asset List */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
            <h3 className="font-bold mb-4 flex items-center gap-2"><Briefcase size={20} className="text-primary" /> Meus Ativos Consolidados</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ativo</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Qtd. estimada</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Preço Médio</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Custo Total</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Proventos</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioList.length > 0 ? portfolioList.map(p => (
                    <tr key={p.ticker} style={{ borderBottom: '1px solid var(--border-color)', height: '50px' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{p.ticker}</div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{p.quantity}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(p.quantity > 0 ? (p.totalInvested / p.quantity) : 0)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatCurrency(p.totalInvested)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success-color)' }}>{formatCurrency(p.dividends)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum ativo comprado via lançamentos.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Allocation Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
            <h3 className="font-bold mb-4 flex items-center gap-2"><PieChart size={20} className="text-primary" /> Alocação Estimada</h3>
            <div style={{ height: '240px' }}>
              {allocationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#171923', borderColor: 'var(--border-color)' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Aguardando compras de ativos...
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem' }}>
              {allocationData.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted">{d.name}</span>
                  </div>
                  <span className="font-bold">{((d.value / allocationData.reduce((s, x) => s + x.value, 0)) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          {/* Renda Fixa Calculator */}
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-lg)' }}>
                <LineChart className="text-blue-500" style={{ color: '#3b82f6' }} size={24} />
              </div>
              <div>
                <h2 className="font-bold text-xl">Simulador Renda Fixa (Juros Compostos)</h2>
                <p className="text-sm text-muted">Projete o valor futuro dos seus aportes de CDB, Tesouro e LCI.</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Aporte Inicial (R$)</label>
                <input type="number" step="0.01" className="input-field" placeholder="Ex: 5000.00" value={fiInitial} onChange={e => setFiInitial(e.target.value)} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Aporte Mensal (R$)</label>
                <input type="number" step="0.01" className="input-field" placeholder="Ex: 500.00" value={fiMonthly} onChange={e => setFiMonthly(e.target.value)} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', position: 'relative' }} ref={rateRef}>
                  <label className="input-label" style={{ margin: 0 }}>Taxa Fixa (%)</label>
                  <button 
                    type="button"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setIsRateDropdownOpen(!isRateDropdownOpen)}
                  >
                    {fiRatePeriod === 'monthly' ? 'Ao Mês' : fiRatePeriod === 'semesterly' ? 'Ao Semestre' : 'Ao Ano'}
                    <ChevronDown size={12} />
                  </button>
                  {isRateDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: '#1e202d', border: '1px solid var(--primary-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem', border: 'none', textAlign: 'left', width: '120px' }} onClick={() => { setFiRatePeriod('monthly'); setIsRateDropdownOpen(false); }}>Ao Mês</button>
                      <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem', border: 'none', textAlign: 'left', width: '120px' }} onClick={() => { setFiRatePeriod('semesterly'); setIsRateDropdownOpen(false); }}>Ao Semestre</button>
                      <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem', border: 'none', textAlign: 'left', width: '120px' }} onClick={() => { setFiRatePeriod('yearly'); setIsRateDropdownOpen(false); }}>Ao Ano</button>
                    </div>
                  )}
                </div>
                <input type="number" step="0.01" className="input-field" placeholder="Ex: 0.8" value={fiRate} onChange={e => setFiRate(e.target.value)} />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', position: 'relative' }} ref={timeRef}>
                  <label className="input-label" style={{ margin: 0 }}>Prazo Total</label>
                  <button 
                    type="button"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                  >
                    {fiTimePeriod === 'months' ? 'Em Meses' : fiTimePeriod === 'semesters' ? 'Em Semestres' : 'Em Anos'}
                    <ChevronDown size={12} />
                  </button>
                  {isTimeDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: '#1e202d', border: '1px solid var(--primary-color)', borderRadius: 'var(--radius-md)', padding: '0.5rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem', border: 'none', textAlign: 'left', width: '120px' }} onClick={() => { setFiTimePeriod('months'); setIsTimeDropdownOpen(false); }}>Em Meses</button>
                      <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem', border: 'none', textAlign: 'left', width: '120px' }} onClick={() => { setFiTimePeriod('semesters'); setIsTimeDropdownOpen(false); }}>Em Semestres</button>
                      <button type="button" className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem', border: 'none', textAlign: 'left', width: '120px' }} onClick={() => { setFiTimePeriod('years'); setIsTimeDropdownOpen(false); }}>Em Anos</button>
                    </div>
                  )}
                </div>
                <input type="number" className="input-field" placeholder="Ex: 24" value={fiMonths} onChange={e => setFiMonths(e.target.value)} />
              </div>
            </div>

            <div style={{ background: 'var(--bg-base)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-lg text-muted">Montante Bruto Esperado:</h3>
              <span className="text-3xl font-bold font-display" style={{ color: '#3b82f6' }}>{formatCurrency(fiResult)}</span>
            </div>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-lg)' }}>
                <Calculator className="text-primary" size={24} />
              </div>
              <div>
                <h2 className="font-bold text-xl">Fórmula de Graham</h2>
                <p className="text-sm text-muted">Avalie o Preço Justo de uma ação com base no seu VPA e LPA.</p>
              </div>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Valor Patrimonial por Ação (VPA)</label>
              <input type="number" step="0.01" className="input-field" placeholder="Ex: 15.00" value={grahamVpa} onChange={e => setGrahamVpa(e.target.value)} />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Lucro por Ação (LPA)</label>
              <input type="number" step="0.01" className="input-field" placeholder="Ex: 2.50" value={grahamLpa} onChange={e => setGrahamLpa(e.target.value)} />
            </div>
            <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <h3 className="text-sm text-muted mb-1">Preço Justo (Graham):</h3>
              <span className="text-3xl font-bold text-success font-display">{formatCurrency(fairPriceGraham)}</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-lg)' }}>
                <BarChart2 className="text-success" size={24} />
              </div>
              <div>
                <h2 className="font-bold text-xl">Método Bazin (Dividendos)</h2>
                <p className="text-sm text-muted">Defina o teto de compra por Yield mínimo aceitável.</p>
              </div>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Dividendo Anual Esperado / Ação (R$)</label>
              <input type="number" step="0.01" className="input-field" placeholder="Ex: 1.20" value={bazinDividend} onChange={e => setBazinDividend(e.target.value)} />
            </div>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label">Yield Mínimo Aceitável (%)</label>
              <input type="number" step="0.1" className="input-field" placeholder="Ex: 6.0" value={bazinYield} onChange={e => setBazinYield(e.target.value)} />
            </div>
            <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <h3 className="text-sm text-muted mb-1">Preço Teto / Justo (Bazin):</h3>
              <span className="text-3xl font-bold text-primary font-display">{formatCurrency(fairPriceBazin)}</span>
            </div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h2 className="font-bold text-lg mb-4">Meus Ativos (Movimentações)</h2>
          <div className="transaction-list" style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {investmentTxs.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: '2rem 0' }}>
                Nenhum lançamento de ativos ainda. Clique nos botões acima para registrar.
              </div>
            ) : (
              investmentTxs.sort((a,b) => new Date(b.date||0) - new Date(a.date||0)).map(t => {
                const tDateStr = t && t.date ? String(t.date) : '';
                const isoDatePart = tDateStr.includes('T') ? tDateStr.split('T')[0] : tDateStr;
                const dateParts = isoDatePart.split('-');
                const y = dateParts[0] || '';
                const m = dateParts[1] || '';
                const d = dateParts[2] || '';
                const wName = wallets.find(w => w.id === t.walletId)?.name || 'Sem Carteira';
                
                return (
                  <div key={t.id} className="transaction-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                    <div className="transaction-info">
                      <div className="transaction-icon" style={{ 
                        background: t.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: t.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)'
                      }}>
                        {t.type === 'income' ? <TrendingUp size={24} /> : <ShoppingBag size={24} />}
                      </div>
                      <div className="transaction-details">
                        <span className="transaction-title">
                          <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>[{t.subCategory}]</span>
                          {t.ticker && <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', marginRight: '0.5rem' }}>{t.ticker}</span>}
                          {t.title}
                        </span>
                        <span className="transaction-date">
                          <strong style={{ color: 'var(--text-main)' }}>{`${d}/${m}/${y}`}</strong> • Saldo por: {wName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`transaction-amount ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`} style={{ marginRight: '1rem' }}>
                        {t.type === 'income' ? '+ ' : '- '}{formatCurrency(t.amount)}
                      </span>
                      <button className="btn-icon" onClick={() => openEditTransaction(t)} title="Editar"><Edit2 size={16} /></button>
                      <button className="btn-icon" onClick={() => deleteTransaction(t.id)} title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWallets = () => {
    const totalPatrimony = wallets.reduce((acc, w) => {
      if (w.type === 'checking') return acc + (parseFloat(w.dynamicBalance) || 0);
      return acc; // Cartões de crédito não entram no "Patrimônio positivo vivo", são linhas de crédito
    }, 0);

    const totalCreditAvailable = wallets.reduce((acc, w) => {
      if (w.type === 'credit') {
        const available = (parseFloat(w.limit) || 0) + (parseFloat(w.dynamicBalance) || 0);
        return acc + Math.max(available, 0); // Fatura é negativa, diminui o limite.
      }
      return acc;
    }, 0);

    return (
      <div className="animate-fade-in">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Minhas Carteiras</h1>
            <p className="dashboard-subtitle">Gestão contábil e seus saldos dinâmicos baseados no fluxo de caixa real.</p>
          </div>
          <button className="btn btn-primary" onClick={openNewWallet}>
            <Plus size={18} />
            Nova Carteira
          </button>
        </div>

        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card glass-panel" style={{ border: '1px solid var(--primary-color)' }}>
            <div className="stat-header">
              <span className="stat-title text-primary">Patrimônio Total (Contas Corrente)</span>
            </div>
            <div className="stat-value">{formatCurrency(totalPatrimony)}</div>
          </div>
          <div className="stat-card glass-panel" style={{ border: '1px solid var(--success-color)' }}>
            <div className="stat-header">
              <span className="stat-title text-success">Crédito Disponível Total</span>
            </div>
            <div className="stat-value text-success">{formatCurrency(totalCreditAvailable)}</div>
          </div>
        </div>

        <div className="stats-grid">
          {wallets.map(w => {
            const isNegativeAlert = w.dynamicBalance < 0 && w.type === 'checking';
            return (
              <div key={w.id} className="stat-card glass-panel" style={{ 
                background: w.type === 'checking' ? 'linear-gradient(135deg, #171923, #1e202d)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: w.type === 'checking' ? 'var(--text-main)' : 'white',
                position: 'relative',
                border: isNegativeAlert ? '1px solid var(--danger-color)' : 'none'
              }}>
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-icon" onClick={() => openEditWallet(w)} style={{ color: w.type === 'checking' ? 'var(--text-muted)' : 'white' }} title="Editar Caixa/Limite Inicial"><Edit2 size={16} /></button>
                  <button className="btn-icon" onClick={() => handleDeleteWallet(w)} style={{ color: w.type === 'checking' ? 'var(--text-muted)' : 'white' }} title="Excluir"><Trash2 size={16} /></button>
                </div>
                
                <div className="flex items-center mb-4 gap-2" style={{ marginTop: '10px' }}>
                  {w.type === 'checking' ? <Wallet className={isNegativeAlert ? 'text-danger' : 'text-primary'} /> : <CreditCard className="text-white" />}
                  <span className="font-bold text-lg">{w.name} {isNegativeAlert ? '(Negativado)' : ''}</span>
                </div>
                
                {w.type === 'checking' ? (
                  <>
                    <div className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Saldo Computado (Entrada - Saída)</div>
                    <div className="text-3xl font-bold font-display" style={{ color: isNegativeAlert ? 'var(--danger-color)' : 'inherit' }}>
                      {formatCurrency(w.dynamicBalance || 0)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>Fatura Atual</div>
                    <div className="text-3xl font-bold font-display">{formatCurrency(w.dynamicBalance || 0)}</div>
                    <div className="mt-4 text-sm flex justify-between" style={{ color: 'rgba(255,255,255,0.8)', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.5rem' }}>
                      <span>Limite Inicial:</span>
                      <span className="font-bold">{formatCurrency(w.limit || 0)}</span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
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
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Wallet /> Fync
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><LayoutDashboard size={20} /> Visão Geral</div>
          <div className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}><PieChart size={20} /> Relatórios</div>
          <div className={`nav-item ${activeTab === 'investments' ? 'active' : ''}`} onClick={() => setActiveTab('investments')}><TrendingUp size={20} /> Investimentos</div>
          <div className={`nav-item ${activeTab === 'wallets' ? 'active' : ''}`} onClick={() => setActiveTab('wallets')}><CreditCard size={20} /> Carteiras</div>
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={20} /> Configurações</div>
        </nav>
        <div className="sidebar-footer">
          <div className="nav-item" onClick={logout}><LogOut size={20} /> Sair</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-search">
            <Search className="search-icon" size={18} />
            <input type="text" className="search-input" placeholder="Buscar..." />
          </div>
          <div className="header-actions">
            <button className="btn-icon"><Bell size={20} /></button>
            <div className="user-profile">
              <div className="user-info text-right" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="font-medium text-sm">{currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0]}</span>
                <span className="text-xs text-muted">Plano Premium</span>
              </div>
              <div className="user-avatar" style={{ background: accentColor }}>{(currentUser?.user_metadata?.name || currentUser?.email)?.charAt(0).toUpperCase()}</div>
            </div>
          </div>
        </header>

        <div className="dashboard-scroll-area">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'investments' && renderInvestments()}
          {activeTab === 'wallets' && renderWallets()}
          {activeTab === 'settings' && renderSettings()}
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
              onKeyDown={(e) => { if(e.key === 'F2') { e.preventDefault(); handleAddTransaction(e); } }}
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
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 'bold' }}>R$</span>
                  <input 
                    type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" 
                    value={amount} onChange={e => setAmount(e.target.value)} required 
                    style={{ paddingLeft: '2.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}
                  />
                </div>
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
          <div className="modal-content glass-panel" style={{ maxWidth: '700px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                  <UploadCloud size={20} className="text-primary" />
                </div>
                <h2>Pré-visualização do Extrato</h2>
              </div>
              <button type="button" className="btn-icon" onClick={() => setOfxPreview(null)}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <label className="input-label" style={{ marginBottom: '0.5rem' }}>Importar estas transações para qual conta?</label>
                <select 
                  className="input-field" 
                  value={ofxPreview.walletId} 
                  onChange={e => setOfxPreview({ ...ofxPreview, walletId: e.target.value })}
                  style={{ background: '#1a1c2e' }}
                >
                  <option value="">Selecione uma conta...</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.type === 'credit' ? 'Cartão' : 'Corrente'})</option>
                  ))}
                </select>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.03)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Data</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Descrição</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Categoria</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ofxPreview.items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem' }}>{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 500 }} title={item.title}>
                            {item.title}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <select 
                            style={{ 
                              background: '#1a1c2e', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              color: 'white', 
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              cursor: 'pointer'
                            }}
                            value={item.category}
                            onChange={(e) => {
                              const newItems = [...ofxPreview.items];
                              newItems[idx].category = e.target.value;
                              setOfxPreview({ ...ofxPreview, items: newItems });
                            }}
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.id}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: item.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 'bold' }}>
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
                  disabled={!ofxPreview.walletId}
                >
                  Confirmar Importação ({ofxPreview.items.length})
                </button>
              </div>
            </div>
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
    </div>
  );
}
