import React from "react";
import styled from "styled-components";

const Modal = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Box = styled.div`
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  width: 300px;
  text-align: center;
`;

export default function DeleteJob({ job, onConfirm, onCancel }) {
  return (
    <Modal>
      <Box>
        <h3>Delete Job</h3>
        <p>Are you sure you want to delete <strong>{job.title}</strong> at {job.company}?</p>
        <button onClick={onConfirm}>✅ Yes, Delete</button>
        <button onClick={onCancel}>❌ Cancel</button>
      </Box>
    </Modal>
  );
}
