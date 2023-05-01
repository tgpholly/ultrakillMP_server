export class Vec3 {
	public x:number;
	public y:number;
	public z:number;

	constructor(x:number, y:number, z:number) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	toString() {
		return `X: ${this.x.toFixed(3)} Y: ${this.y.toFixed(3)} Z: ${this.z.toFixed(3)}`;
	}
}