import React, { useState } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  parseISO, isWithinInterval, startOfDay, endOfDay 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './EquipmentCalendar.css';

const STATUS_COLORS = {
  'Pending': '#f59e0b',           
  'Ready to Pickup': '#3b82f6',   
  'Released': '#10b981',          
  'Overdue': '#ef4444',           
  'Returned': '#94a3b8',          
  'Returned w/ Damage': '#94a3b8',
  'Damaged': '#94a3b8',
  'Rejected': null                
};

const EquipmentCalendar = ({ records }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = new Date();

  const validRecords = records.filter(r => 
    r.status !== 'Rejected' && r.borrow_date && r.expected_return
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const getRecordsForDay = (day) => {
    return validRecords.filter(r => {
      let bDate = parseISO(r.borrow_date);
      let rDate = r.actual_return ? parseISO(r.actual_return) : parseISO(r.expected_return);
      
      const intervalStart = startOfDay(bDate);
      const intervalEnd = endOfDay(rDate);
      
      return isWithinInterval(day, { start: intervalStart, end: intervalEnd });
    });
  };

  const renderHeader = () => (
    <div className="calendar-header">
      <button onClick={prevMonth} className="cal-btn"><ChevronLeft /></button>
      <h2>{format(currentDate, 'MMMM yyyy')}</h2>
      <button onClick={nextMonth} className="cal-btn"><ChevronRight /></button>
    </div>
  );

  const renderDays = () => {
    const days = [];
    let date = startOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
      days.push(<div className="cal-col cal-col-title" key={i}>{format(date, 'EEEE')}</div>);
      date = addDays(date, 1);
    }
    return <div className="cal-days-row">{days}</div>;
  };

  const renderCells = () => {
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        
        const dayRecords = getRecordsForDay(cloneDay);
        
        let bgColor = '';
        if (dayRecords.length > 0) {
          if (dayRecords.some(r => r.display_status === 'Overdue')) bgColor = STATUS_COLORS['Overdue'];
          else if (dayRecords.some(r => r.display_status === 'Released')) bgColor = STATUS_COLORS['Released'];
          else if (dayRecords.some(r => r.display_status === 'Ready to Pickup')) bgColor = STATUS_COLORS['Ready to Pickup'];
          else if (dayRecords.some(r => r.display_status === 'Pending')) bgColor = STATUS_COLORS['Pending'];
          else bgColor = STATUS_COLORS['Returned']; 
        }

        days.push(
          <div
            className={`cal-cell ${!isSameMonth(day, monthStart) ? 'cal-disabled' : ''} ${isSameDay(day, today) ? 'cal-today' : ''}`}
            key={day.toString()}
          >
            <span className="cal-number">{formattedDate}</span>
            
            {dayRecords.length > 0 && (
              <div className="cal-events">
                <div className="cal-event-indicator" style={{ backgroundColor: bgColor }}>
                  {dayRecords.length} Active {dayRecords.length === 1 ? 'Request' : 'Requests'}
                </div>
                
                <div className="cal-tooltip">
                  <div className="cal-tooltip-title">{format(cloneDay, 'MMM d, yyyy')}</div>
                  {dayRecords.map(r => (
                    <div key={r.id} className="cal-tooltip-item">
                      <div className="cal-tooltip-dot" style={{ backgroundColor: STATUS_COLORS[r.display_status] || '#ccc' }}></div>
                      <div className="cal-tooltip-info">
                        <strong>{r.borrower_name}</strong>
                        <span>{r.quantity}x {r.equipment_inventory?.item_name || 'Item'}</span>
                        <span className="cal-tooltip-status">({r.display_status})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="cal-row" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="cal-body">{rows}</div>;
  };

  const renderLegend = () => (
    <div className="cal-legend">
      <div className="cal-legend-item"><span style={{ backgroundColor: STATUS_COLORS['Pending'] }}></span> Pending</div>
      <div className="cal-legend-item"><span style={{ backgroundColor: STATUS_COLORS['Ready to Pickup'] }}></span> Ready to Pickup</div>
      <div className="cal-legend-item"><span style={{ backgroundColor: STATUS_COLORS['Released'] }}></span> Released</div>
      <div className="cal-legend-item"><span style={{ backgroundColor: STATUS_COLORS['Overdue'] }}></span> Overdue</div>
      <div className="cal-legend-item"><span style={{ backgroundColor: STATUS_COLORS['Returned'] }}></span> Historical (Returned)</div>
    </div>
  );

  return (
    <div className="equipment-calendar">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderLegend()}
    </div>
  );
};

export default EquipmentCalendar;
