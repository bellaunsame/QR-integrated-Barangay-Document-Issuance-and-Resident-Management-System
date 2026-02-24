import { useState } from 'react';
import Draggable from 'react-draggable';
import { Trash2, Plus, Type, Bold, GripHorizontal } from 'lucide-react';

const DragDropTemplateEditor = ({ initialElements = [], onChange }) => {
  const [elements, setElements] = useState(
    Array.isArray(initialElements) ? initialElements : []
  );
  
  const [activeId, setActiveId] = useState(null);

  const templateVariableGroups = [
    {
      groupName: 'Resident Information',
      vars: [
        { name: 'full_name', description: 'Full name of resident' },
        { name: 'first_name', description: 'First name' },
        { name: 'middle_name', description: 'Middle name' },
        { name: 'last_name', description: 'Last name' },
        { name: 'age', description: 'Age' },
        { name: 'gender', description: 'Gender' },
        { name: 'civil_status', description: 'Civil status' },
        { name: 'occupation', description: 'Occupation' },
        { name: 'nationality', description: 'Nationality' }
      ]
    },
    {
      groupName: 'Location & Residency',
      vars: [
        { name: 'address', description: 'Complete address' },
        { name: 'barangay', description: 'Barangay name' },
        { name: 'city_municipality', description: 'City/Municipality' },
        { name: 'province', description: 'Province' },
        { name: 'residency_years', description: 'Years as resident' }
      ]
    },
    {
      groupName: 'Barangay Officials',
      vars: [
        { name: 'barangay_chairman', description: 'Chairman name' },
        { name: 'barangay_kagawad_list', description: 'List of Kagawads' },
        { name: 'barangay_name', description: 'Official barangay name' }
      ]
    },
    {
      groupName: 'Document Elements',
      vars: [
        { name: 'date_issued', description: 'Date issued (long format)' },
        { name: 'validation-date', description: 'Validation Date' },
        { name: 'purpose', description: 'Purpose of request' },
        { name: 'thumbprint_boxes', description: 'Thumbprint boxes (left & right)' }
      ]
    }
  ];

  const addElement = (textValue, isCustom = false) => {
    const newId = Date.now();
    const newElement = {
      id: newId,
      text: isCustom ? 'Type your paragraph here...' : `{{${textValue}}}`,
      x: 50,
      y: 100,
      fontSize: 12,
      isBold: false,
      width: isCustom ? 500 : 150, 
      height: isCustom ? 100 : 30
    };
    const updated = [...elements, newElement];
    setElements(updated);
    onChange(updated);
    setActiveId(newId);
  };

  const handleDragStop = (id, e, data) => {
    const updated = elements.map(el => 
      el.id === id ? { ...el, x: data.x, y: data.y } : el
    );
    setElements(updated);
    onChange(updated);
  };

  const handleTextChange = (id, newText) => {
    const updated = elements.map(el => 
      el.id === id ? { ...el, text: newText } : el
    );
    setElements(updated);
    onChange(updated);
  };

  // Saves the new width/height to state when you finish dragging the corner
  const handleResize = (id, e) => {
    const newWidth = e.target.offsetWidth;
    const newHeight = e.target.offsetHeight;
    const updated = elements.map(el => 
      el.id === id ? { ...el, width: newWidth, height: newHeight } : el
    );
    setElements(updated);
    onChange(updated);
  };

  const toggleBold = (id) => {
    const updated = elements.map(el => 
      el.id === id ? { ...el, isBold: !el.isBold } : el
    );
    setElements(updated);
    onChange(updated);
  };

  const removeElement = (id) => {
    const updated = elements.filter(el => el.id !== id);
    setElements(updated);
    onChange(updated);
  };

  return (
    <div style={{ display: 'flex', gap: '20px', marginTop: '10px', marginBottom: '20px' }}>
      
      {/* LEFT SIDE: Variable Palette */}
      <div style={{ width: '280px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '14px', color: '#1e293b', margin: 0, fontWeight: 'bold' }}>Add to Document</h3>
        
        <button
          type="button"
          onClick={() => addElement('', true)}
          style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
        >
          <Type size={16} /> Add Paragraph Box
        </button>

        <hr style={{ borderTop: '1px solid #cbd5e1', width: '100%', margin: '5px 0' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' }}>
          {templateVariableGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <h4 style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {group.groupName}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {group.vars.map((vr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addElement(vr.name)}
                    title={vr.description}
                    style={{ padding: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: '12px', color: '#334155' }}>{vr.name}</span>
                    <Plus size={14} color="#2563eb" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: The Canvas */}
      <div style={{ flex: 1, overflowX: 'auto', background: '#f1f5f9', padding: '20px', borderRadius: '8px' }}>
        <div 
          onClick={() => setActiveId(null)}
          style={{ 
            width: '794px', 
            height: '1123px', 
            background: 'white', 
            border: '1px solid #cbd5e1', 
            position: 'relative', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            margin: '0 auto',
            cursor: 'text' 
          }}
        >
          <div style={{ position: 'absolute', top: 10, left: 10, color: '#cbd5e1', fontSize: '12px', userSelect: 'none' }}>
            A4 Canvas
          </div>

          {elements.map((el) => {
            const isActive = activeId === el.id;

            return (
              <Draggable
                key={el.id}
                bounds="parent"
                handle=".drag-handle"
                defaultPosition={{ x: el.x, y: el.y }}
                onStop={(e, data) => handleDragStop(el.id, e, data)}
              >
                <div 
                  onClick={(e) => { e.stopPropagation(); setActiveId(el.id); }}
                  style={{ 
                    position: 'absolute', 
                    zIndex: isActive ? 100 : 10, 
                  }}
                >
                  
                  {isActive && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '-35px', 
                      left: '0', 
                      background: '#1e293b', 
                      borderRadius: '6px', 
                      display: 'flex', 
                      alignItems: 'center',
                      padding: '4px',
                      gap: '4px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                    }}>
                      <div className="drag-handle" style={{ cursor: 'grab', padding: '4px 8px', color: 'white', display: 'flex', alignItems: 'center' }} title="Drag to move">
                        <GripHorizontal size={14} />
                      </div>
                      <div style={{ width: '1px', height: '16px', background: '#475569' }}></div>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); toggleBold(el.id); }}
                        style={{ background: el.isBold ? '#3b82f6' : 'transparent', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '4px', color: 'white' }}
                        title="Bold"
                      >
                        <Bold size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                        style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', color: '#f87171' }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  <textarea 
                    value={el.text}
                    onChange={(e) => handleTextChange(el.id, e.target.value)}
                    onMouseUp={(e) => handleResize(el.id, e)} // Saves the size!
                    style={{
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      border: isActive ? '1px dashed #3b82f6' : '1px solid transparent',
                      background: isActive ? 'rgba(59, 130, 246, 0.02)' : 'transparent',
                      padding: '4px',
                      fontSize: `${el.fontSize + 2}px`,
                      fontWeight: el.isBold ? 'bold' : 'normal',
                      fontFamily: '"Times New Roman", Times, serif',
                      color: el.text.includes('{{') ? '#2563eb' : '#000',
                      resize: isActive ? 'both' : 'none',
                      outline: 'none',
                      overflow: 'auto', // FIXED: This brings back the native resize handle!
                      lineHeight: '1.5'
                    }}
                  />
                </div>
              </Draggable>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DragDropTemplateEditor;