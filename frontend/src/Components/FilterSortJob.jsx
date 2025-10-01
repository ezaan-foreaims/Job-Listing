import React, { useState } from "react";
import styled from "styled-components";

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  background: #f9fafb;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
`;

const Input = styled.input`
  flex: 1;
  min-width: 150px;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
  }
`;

const Select = styled.select`
  flex: 1;
  min-width: 160px;
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  background: #fff;
  outline: none;
  transition: border 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
  }
`;

const Button = styled.button`
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;

  &:hover {
    background: #1e40af;
  }

  &:active {
    transform: scale(0.97);
  }
`;

export default function FilterSortJob({ onFilter }) {
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("posting_date_desc");

  const apply = () => {
    onFilter({ location, job_type: jobType, tag, sort });
  };

  return (
    <Bar>
      <Input
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <Input
        placeholder="Tag"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
      />
      <Select value={jobType} onChange={(e) => setJobType(e.target.value)}>
        <option value="">All Types</option>
        <option value="Full-time">Full-time</option>
        <option value="Part-time">Part-time</option>
        <option value="Internship">Internship</option>
        <option value="Contract">Contract</option>
      </Select>
      <Select value={sort} onChange={(e) => setSort(e.target.value)}>
        <option value="posting_date_desc">Newest First</option>
        <option value="posting_date_asc">Oldest First</option>
        <option value="title_asc">Title A-Z</option>
        <option value="title_desc">Title Z-A</option>
      </Select>
      <Button onClick={apply}>Apply</Button>
    </Bar>
  );
}
