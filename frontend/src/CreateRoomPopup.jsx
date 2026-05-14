function CreateRoomPopup({
  show,
  roomId,
  setRoomId,
  createRoom,
  closePopup
}) {
  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <h2>Create Room</h2>

        <input
          style={styles.input}
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />

        <button style={styles.green} onClick={createRoom}>
          Create Room
        </button>

        <button style={styles.red} onClick={closePopup}>
          Close
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  popup: {
    background: "#222",
    color: "white",
    padding: "30px",
    borderRadius: "10px",
    width: "350px"
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px"
  },
  green: {
    width: "100%",
    padding: "10px",
    background: "green",
    color: "white",
    border: "none",
    marginBottom: "10px"
  },
  red: {
    width: "100%",
    padding: "10px",
    background: "red",
    color: "white",
    border: "none"
  }
};

export default CreateRoomPopup;