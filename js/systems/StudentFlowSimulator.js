import { generateStudentIdentity } from "../data/namePools.js";
import { SERVICE_POINTS } from "../data/canteenLayout.js";

export default class StudentFlowSimulator {
  constructor(controller) {
    this.controller = controller;

    this.students = [];
    this.nextStudentId = 1;

    this.spawnTimer = 0;
    this.spawnInterval = 2.4;
    this.maxStudents = 8;

    this.queueY = 320;
    this.queueStartX = 140;
    this.queueSpacing = 40;

    this.servicePoint = SERVICE_POINTS.ramenCounter;
    this.counterX = this.servicePoint.x;
    this.counterY = this.servicePoint.y;

    this.exitX = 455;
    this.exitY = 140;
  }

  spawnStudent() {
    if (this.students.length >= this.maxStudents) return;

    const scenario = this.controller.createRandomTransactionScenario();
    const identity = generateStudentIdentity();

    scenario.studentId = identity.studentId;
    scenario.studentDisplayName = identity.displayName;

    this.students.push({
      id: `sim_student_${this.nextStudentId++}`,
      x: 70,
      y: this.queueY,
      size: 18,
      speed: 110 + Math.random() * 10,
      state: "queueing",
      payTimer: 0,
      remove: false,
      hasProcessedTransaction: false,
      scenario,
      displayName: identity.displayName,
      originType: identity.originType,
      color: scenario.paymentMethod === "Campus Card" ? "#60a5fa" : "#f87171"
    });
  }

  moveToward(student, targetX, targetY, deltaTime) {
    const dx = targetX - student.x;
    const dy = targetY - student.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.5) {
      student.x = targetX;
      student.y = targetY;
      return true;
    }

    const moveDistance = student.speed * deltaTime;
    const ratio = Math.min(1, moveDistance / distance);

    student.x += dx * ratio;
    student.y += dy * ratio;

    return false;
  }

  update(deltaTime) {
    this.spawnTimer += deltaTime;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnStudent();
    }

    const queueingStudents = this.students.filter((student) => student.state === "queueing");

    queueingStudents.forEach((student, index) => {
      const targetX = this.queueStartX + index * this.queueSpacing;
      this.moveToward(student, targetX, this.queueY, deltaTime);
    });

    const payingStudent = this.students.find(
      (student) => student.state === "moving_to_counter" || student.state === "paying"
    );

    if (!payingStudent && queueingStudents.length > 0) {
      const firstStudent = queueingStudents[0];

      const firstTargetX = this.queueStartX;
      const readyForService =
        Math.abs(firstStudent.x - firstTargetX) < 3 &&
        Math.abs(firstStudent.y - this.queueY) < 3;

      if (readyForService) {
        firstStudent.state = "moving_to_counter";
      }
    }

    this.students.forEach((student) => {
      if (student.state === "moving_to_counter") {
        const arrived = this.moveToward(student, this.counterX, this.counterY, deltaTime);
        if (arrived) {
          student.state = "paying";
          student.payTimer = 0;
        }
      } else if (student.state === "paying") {
        student.payTimer += deltaTime;

        if (student.payTimer >= 1.0 && !student.hasProcessedTransaction) {
          this.controller.processTransaction({
            ...student.scenario,
            source: "auto_queue"
          });

          student.hasProcessedTransaction = true;
          student.state = "exiting";
        }
      } else if (student.state === "exiting") {
        const exited = this.moveToward(student, this.exitX, this.exitY, deltaTime);
        if (exited) {
          student.remove = true;
        }
      }
    });

    this.students = this.students.filter((student) => !student.remove);

    const liveQueueLength = this.students.filter(
      (student) =>
        student.state === "queueing" ||
        student.state === "moving_to_counter" ||
        student.state === "paying"
    ).length;

    this.controller.updateOperationalMetrics(liveQueueLength);
  }

  draw(ctx) {
    ctx.save();

    // queue label
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "14px Arial";
    ctx.fillText("Live Student Queue", 130, 295);

    // service point marker
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(this.counterX - 16, this.counterY - 16, 32, 32);

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.counterX - 16, this.counterY - 16, 32, 32);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px Arial";
    ctx.fillText("POS", this.counterX - 11, this.counterY + 4);

    // students
    this.students.forEach((student) => {
      ctx.fillStyle = student.color;
      ctx.fillRect(student.x, student.y, student.size, student.size);

      const nameLabel =
        student.displayName.length > 12
          ? `${student.displayName.slice(0, 12)}...`
          : student.displayName;

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "10px Arial";
      ctx.fillText(nameLabel, student.x - 4, student.y - 8);

      if (student.state === "paying") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(student.x - 2, student.y - 2, student.size + 4, student.size + 4);
      }
    });

    ctx.restore();
  }
}
