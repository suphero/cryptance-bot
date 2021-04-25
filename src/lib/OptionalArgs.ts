import _ from 'lodash';

export class OptionalArgs {
  private args: string;
  constructor(args: string) {
    this.args = args;
  }

  public get isDetail(): boolean {
    return _.includes(this.args, 'd');
  }

  public get isTarget(): boolean {
    return _.includes(this.args, 't');
  }

  public get isNote(): boolean {
    return _.includes(this.args, 'n');
  }
}
