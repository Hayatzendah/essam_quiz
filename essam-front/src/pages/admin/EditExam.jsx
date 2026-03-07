import React from 'react';
import { useParams } from 'react-router-dom';
import QuestionCreateForm from '../../components/QuestionCreateForm';

function EditExam() {
  const { id } = useParams();

  return <QuestionCreateForm examId={id} />;
}

export default EditExam;
