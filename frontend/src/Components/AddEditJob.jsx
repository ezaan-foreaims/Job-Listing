import React, { useState, useEffect } from "react";
import styled from "styled-components";

const Modal = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Box = styled.div`
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  width: 400px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.15);
`;

const Title = styled.h2`
  margin: 0 0 16px 0;
  font-size: 1.4rem;
  color: #2563eb;
  text-align: center;
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border 0.2s;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
`;

const Button = styled.button`
  padding: 8px 14px;
  font-size: 0.9rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;

  ${({ variant }) =>
    variant === "primary"
      ? `
        background: #2563eb;
        color: #fff;

        &:hover {
          background: #1e40af;
        }
      `
      : `
        background: #e5e7eb;
        color: #374151;

        &:hover {
          background: #d1d5db;
        }
      `}

  &:active {
    transform: scale(0.97);
  }
`;

export default function AddEditJob({ initialData, onSave, onClose }) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    job_type: "",
    tags: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        tags: initialData.tags.join(", "),
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    const job = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    onSave(job);
  };

  return (
    <Modal>
      <Box>
        <Title>{initialData ? "✏️ Edit Job" : "➕ Add Job"}</Title>
        <Form>
          <Input name="title" placeholder="Job Title" value={form.title} onChange={handleChange} />
          <Input name="company" placeholder="Company" value={form.company} onChange={handleChange} />
          <Input name="location" placeholder="Location" value={form.location} onChange={handleChange} />
          <Input name="job_type" placeholder="Job Type (Full-time, Part-time...)" value={form.job_type} onChange={handleChange} />
          <Input name="tags" placeholder="Tags (comma separated)" value={form.tags} onChange={handleChange} />
        </Form>
        <ButtonRow>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit}>Save</Button>
        </ButtonRow>
      </Box>
    </Modal>
  );
}
