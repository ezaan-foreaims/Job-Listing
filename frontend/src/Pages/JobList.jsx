import React from "react";
import styled from "styled-components";
import JobCard from "../Components/JobCard";

const ListWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
`;

const Empty = styled.p`
  text-align: center;
  color: #6b7280;
  font-size: 1rem;
  margin-top: 40px;
`;

export default function JobList({ jobs, onEdit, onDelete }) {
  if (!jobs.length) return <Empty>No jobs found.</Empty>;

  return (
    <ListWrapper>
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ListWrapper>
  );
}
