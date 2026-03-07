import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ color: [] }],
    [{ size: ['small', false, 'large', 'huge'] }],
    [{ direction: 'ltr' }, { align: [] }],
    ['clean'],
  ],
};

const formats = ['bold', 'italic', 'underline', 'color', 'size', 'direction', 'align'];

export default function RichTextEditor({ value, onChange, placeholder }) {
  return (
    <div dir="ltr">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || ''}
      />
    </div>
  );
}
