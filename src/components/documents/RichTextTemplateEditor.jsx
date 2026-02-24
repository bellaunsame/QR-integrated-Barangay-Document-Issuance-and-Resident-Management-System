import { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // The Word-like theme
import { Plus } from 'lucide-react';

const RichTextTemplateEditor = ({ value, onChange }) => {
  const quillRef = useRef(null);

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
        { name: 'purpose', description: 'Purpose of request' },
        { name: 'thumbprint_boxes', description: 'Thumbprint boxes (left & right)' }
      ]
    }
  ];

  // Insert a variable at the user's current cursor position
  const insertVariable = (variableName) => {
    const editor = quillRef.current.getEditor();
    const cursorPosition = editor.getSelection()?.index || 0;
    
    // Insert the variable tag
    editor.insertText(cursorPosition, `{{${variableName}}}`);
    
    // Move cursor to the end of the inserted variable
    editor.setSelection(cursorPosition + variableName.length + 4);
  };

  // Setup the Word-like Toolbar
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['clean'] // removes formatting
    ],
  }), []);

  return (
    <div style={{ display: 'flex', gap: '20px', marginTop: '10px', marginBottom: '20px', height: '600px' }}>
      
      {/* LEFT SIDE: Variable Palette */}
      <div style={{ width: '280px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '14px', color: '#1e293b', margin: 0, fontWeight: 'bold' }}>Click to Insert</h3>
        <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 10px 0' }}>Place your cursor in the editor, then click a variable below to insert it.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', paddingRight: '5px' }}>
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
                    onClick={() => insertVariable(vr.name)}
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

      {/* RIGHT SIDE: The Word-Like Editor */}
      <div style={{ flex: 1, background: 'white', display: 'flex', flexDirection: 'column' }}>
        <style>
          {`
            /* Make the Quill editor fill the height properly */
            .ql-container {
              flex: 1;
              font-size: 14px;
              font-family: "Times New Roman", Times, serif;
            }
            .ql-editor {
              min-height: 100%;
              padding: 40px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
          `}
        </style>
        <ReactQuill 
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          placeholder="Start typing your document template here..."
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        />
      </div>
    </div>
  );
};

export default RichTextTemplateEditor;