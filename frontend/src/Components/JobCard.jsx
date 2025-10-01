import React from "react";
import styled from "styled-components";

const Card = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const Subtitle = styled.div`
  font-size: 0.9rem;
  color: #374151;
`;

const Meta = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const Tag = styled.span`
  background: #e5e7eb;
  color: #374151;
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 6px;
`;

const Actions = styled.div`
  margin-top: auto;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: background 0.2s;

  ${({ variant }) =>
    variant === "edit"
      ? `
    background: #2563eb;
    color: white;
    &:hover { background: #1e40af; }
  `
      : `
    background: #ef4444;
    color: white;
    &:hover { background: #b91c1c; }
  `}
`;

export default function JobCard({ job, onEdit, onDelete }) {
  return (
    <Card>
      <Title>{job.title}</Title>
      <Subtitle>
        {job.company} • {job.location} • {job.job_type || "N/A"}
      </Subtitle>
      <Meta>Posted on {new Date(job.posting_date).toLocaleDateString()}</Meta>
      {job.tags?.length > 0 && (
        <Tags>
          {job.tags.slice(0, 4).map((tag, i) => (
            <Tag key={i}>{tag}</Tag>
          ))}
        </Tags>
      )}
      <Actions>
        <Button variant="edit" onClick={() => onEdit(job)}>Edit</Button>
        <Button variant="delete" onClick={() => onDelete(job.id)}>Delete</Button>
      </Actions>
    </Card>
  );
}
