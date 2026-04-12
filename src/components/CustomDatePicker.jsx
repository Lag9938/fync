import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import '../pages/Dashboard.css';

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function CustomDatePicker({ value, onChange, placeholder = "Selecione a data..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current value
  const curDate = value ? new Date(value + 'T12:00:00') : new Date();
  const [viewYear, setViewYear] = useState(curDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(curDate.getMonth());

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeMonth = (offset) => {
    let newMonth = viewMonth + offset;
    let newYear = viewYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const selectDate = (day) => {
    const yStr = viewYear;
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    onChange(`${yStr}-${mStr}-${dStr}`);
    setIsOpen(false);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const blanks = Array.from({ length: firstDay }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Format display value
  const displayValue = value ? (() => {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  })() : placeholder;

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%', minWidth: '160px' }} ref={containerRef}>
      <button 
        type="button"
        className="glass-panel btn font-bold w-full" 
        style={{ 
          padding: '0.75rem 1.5rem', 
          borderRadius: 'var(--radius-full)', 
          border: '1px solid var(--primary-color)', 
          color: value ? 'var(--text-main)' : 'var(--text-muted)', 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '0.5rem',
          backgroundColor: 'transparent'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} className="text-primary" />
          {displayValue}
        </span>
      </button>

      {isOpen && (
        <div className="animate-fade-in" style={{ 
          position: 'absolute', 
          top: 'calc(100% + 12px)', 
          left: 0, 
          zIndex: 9999999, 
          padding: '1.5rem', 
          borderRadius: 'var(--radius-xl)', 
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)', 
          backgroundColor: '#171923',
          minWidth: '320px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <button type="button" className="btn-icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-lg">
              {monthNames[viewMonth]} de {viewYear}
            </span>
            <button type="button" className="btn-icon" onClick={() => changeMonth(1)}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Weekdays */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '1rem' }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-muted text-sm font-bold">{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {blanks.map(b => (
              <div key={`blank-${b}`} />
            ))}
            {days.map(d => {
              const checkVal = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSelected = value === checkVal;
              return (
                <button 
                  key={d}
                  type="button"
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ 
                    padding: '0.5rem', 
                    borderRadius: 'var(--radius-md)', 
                    fontSize: '0.875rem',
                    width: '100%',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.05)'
                  }}
                  onClick={() => selectDate(d)}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button 
              type="button"
              className="text-muted text-sm font-bold hover:text-white" 
              style={{ background: 'transparent' }}
              onClick={() => onChange('')}
            >
              Limpar Texto
            </button>
            <button 
              type="button"
              className="text-primary text-sm font-bold" 
              style={{ background: 'transparent' }}
              onClick={() => {
                const now = new Date();
                onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
                setIsOpen(false);
              }}
            >
              Ir para Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
