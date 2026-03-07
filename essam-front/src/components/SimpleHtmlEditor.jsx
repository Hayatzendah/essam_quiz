import React, { useRef, useEffect } from 'react';

const TOOLBAR_BTN = {
  padding: '6px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
};

/**
 * محرر بنص غني + شريط أدوات (مثل الوورد) ويحافظ على تنسيقات اللصق من الوورد.
 */
export default function SimpleHtmlEditor({ value = '', onChange, placeholder, className = '', dir = 'ltr', extraToolbar, editorRef }) {
  const elRef = useRef(null);
  const isInternalChange = useRef(false);

  // Forward internal elRef to external editorRef
  useEffect(() => {
    if (editorRef) {
      if (typeof editorRef === 'function') editorRef(elRef.current);
      else editorRef.current = elRef.current;
    }
  }, [editorRef]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const next = value || '';
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value]);

  const handleInput = () => {
    const el = elRef.current;
    if (!el) return;
    isInternalChange.current = true;
    onChange(el.innerHTML || '');
  };

  const handlePaste = (e) => {
    const html = e.clipboardData?.getData?.('text/html');
    if (html && html.trim()) {
      e.preventDefault();
      const el = elRef.current;
      if (!el) return;
      document.execCommand('insertHTML', false, html);
      isInternalChange.current = true;
      onChange(el.innerHTML || '');
    } else {
      setTimeout(handleInput, 0);
    }
  };

  const exec = (cmd, value = null) => {
    elRef.current?.focus();
    if (value !== null && value !== undefined) {
      document.execCommand(cmd, false, value);
    } else {
      document.execCommand(cmd, false);
    }
    handleInput();
  };

  const isEmpty = !value || value.replace(/<[^>]+>/g, '').trim() === '';

  return (
    <div style={{ position: 'relative' }} className={className}>
      {/* شريط أدوات مثل الوورد */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px 10px',
          border: '1px solid #e2e8f0',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          backgroundColor: '#f8fafc',
        }}
        dir={dir}
      >
        <button type="button" title="عريض" style={TOOLBAR_BTN} onClick={() => exec('bold')}><b>B</b></button>
        <button type="button" title="مائل" style={TOOLBAR_BTN} onClick={() => exec('italic')}><i>I</i></button>
        <button type="button" title="تحته خط" style={TOOLBAR_BTN} onClick={() => exec('underline')}><u>U</u></button>
        <span style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />
        <input
          type="color"
          title="لون النص"
          style={{ ...TOOLBAR_BTN, width: 36, height: 32, padding: 2 }}
          defaultValue="#000000"
          onChange={(e) => exec('foreColor', e.target.value)}
        />
        <span style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />
        <select
          title="حجم الخط"
          style={{ ...TOOLBAR_BTN, minWidth: 90 }}
          onChange={(e) => { const v = e.target.value; if (v) exec('fontSize', v); e.target.value = ''; }}
        >
          <option value="">حجم الخط</option>
          <option value="1">صغير</option>
          <option value="3">عادي</option>
          <option value="5">كبير</option>
          <option value="7">أكبر</option>
        </select>
        <span style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />
        <button type="button" title="محاذاة لليسار" style={TOOLBAR_BTN} onClick={() => exec('justifyLeft')}>≡‎</button>
        <button type="button" title="توسيط" style={TOOLBAR_BTN} onClick={() => exec('justifyCenter')}>≡</button>
        <button type="button" title="محاذاة لليمين" style={TOOLBAR_BTN} onClick={() => exec('justifyRight')}>≡‎</button>
        <button type="button" title="ضبط" style={TOOLBAR_BTN} onClick={() => exec('justifyFull')}>≡</button>
        {extraToolbar && (
          <>
            <span style={{ width: 1, background: '#e2e8f0', margin: '0 4px' }} />
            {extraToolbar}
          </>
        )}
      </div>
      {isEmpty && placeholder && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 52,
            color: '#94a3b8',
            pointerEvents: 'none',
            fontSize: 14,
          }}
          dir={dir}
        >
          {placeholder}
        </div>
      )}
      <div
        ref={elRef}
        contentEditable
        suppressContentEditableWarning
        dir={dir}
        onInput={handleInput}
        onPaste={handlePaste}
        style={{
          minHeight: 120,
          padding: '8px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: '0 0 8px 8px',
          outline: 'none',
          backgroundColor: '#fff',
        }}
      />
    </div>
  );
}
