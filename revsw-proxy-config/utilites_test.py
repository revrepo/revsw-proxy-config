"""*************************************************************************
*
* NUU:BIT CONFIDENTIAL
*
* [2013] - [2015] nuu:bit, Inc.
* All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of nuu:bit, Inc. and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to nuu:bit, Inc.
* and its suppliers and may be covered by U.S. and Foreign Patents,
* patents in process, and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from nuu:bit, Inc.
*
"""
import re


class VCLParser():

    def __init__(self, file_name):

        self.file = open(file_name, 'rb')
        self.last_line = None  # variable to contain last readed line


    def get_line(self):
        if self.last_line:
            line = self.last_line
            self.last_line = ''
        else:
            line = self.file.readline()
            if line is None:
                raise Exception
        if not line:
            return None
        line = line.strip()
        # line = line.strip('*/')
        # skip blank lines and comments
        if not line or line.startswith('#'):
            line = self.get_line()
        elif line.startswith('/*'):
            end_comment = False
            while not end_comment:
                line = self.file.readline()
                line = line.strip()
                if line.endswith('*/'):
                    end_comment = True
            line = self.get_line()
        return line

    def parse_object(self):
        data = {}
        data_if = []
        acl = {}
        sub = {}
        backends = {}
        try:
            while True:
                line = self.get_line()
                if line == None: break
                if re.search(r'acl ([a-zA-Z_0-9]*) {', line):
                    splited_line = line.split(' ')
                    acl[splited_line[1]] = self.parse_acl()

                elif re.search(r'backend ([a-zA-Z_0-9]*) {', line):
                    splited_line = line.split(' ')
                    backends[splited_line[1]] = self.parse_acl()

                elif re.search(r'sub ([a-zA-Z_0-9]*) {', line):
                    splited_line = line.split(' ')
                    sub[splited_line[1]] = self.parse_sub()


                elif re.search(r'if \(([a-zA-Z_0-9 ]*)', line):
                    splited_line = self.parse_if_conditions(line)
                    if line.endswith('}'):
                        data_if.append({splited_line : ''})
                    else:
                        data_if.append(self.parse_if(splited_line))
                else:
                    splited_line = line.split(' ')
        except Exception as e:
            print e.message

        return {'data_if': data_if, 'data': data, 'acl': acl, 'sub': sub, 'backends': backends}

    def parse_if_conditions(self, line, condition=''):
        condition += line
        if line.endswith('{') or line.endswith('}'):
            return condition
        line = self.get_line()
        return self.parse_if_conditions(line, condition)

    def parse_if(self, condition):
        if_data = {}
        statements = {}
        first_iteration = True
        while True:
            line = self.get_line()
            if first_iteration:
                if_data[condition] = self._parse_statement()
                first_iteration = False

            if 'else' in line:
                if_data['else'] = self._parse_statement()
            elif line.startswith('elsif'):
                condition = self.parse_if_conditions(line)
                if_data[condition] = self._parse_statement()
            elif line.startswith('if'):
                condition_if = self.parse_if_conditions(line)
                if line.endswith('}'):
                    if_data[line] += {condition_if: ''}
                else:
                    if_data[line] = self.parse_if(condition_if)
            elif line.endswith('}'):
                self.last_line = self.get_line()
                if not 'els' in self.last_line:
                    break
            else:
                if_data[condition] = line
        return {'if_data': if_data, 'statements': statements}

    def _parse_statement(self):
        lines = []
        if_statements = []
        while True:
            line = self.get_line()
            if line.startswith('if'):
                condition_if = self.parse_if_conditions(line)
                if line.endswith('}'):
                    if_statements += {condition_if: ''}
                else:
                    if_statements += self.parse_if(condition_if)
            elif line.endswith('}'):
                self.last_line = line
                break
            else:
                lines.append(line)

        return lines

    def parse_sub(self):
        sub_data = []
        if_statements = []
        while True:
            line = self.get_line()
            if line.endswith('}'):
                break
            elif line.startswith('sub'):
                self.last_line = line
                break
            if line.startswith('if'):
                # self.last_line = line
                condition = self.parse_if_conditions(line)
                if_statements.append(self.parse_if(condition))
            else:
                sub_data.append(line)

        return {'data': sub_data, 'if_data': if_statements}


    def parse_acl(self):
        acl = []
        if_statements = []
        while True:
            line = self.get_line()
            if line.endswith(';'):
                line.strip(';')
                acl.append(line)

            elif line.endswith('}'):
                break
            else:
                acl.append(line)
        return acl
